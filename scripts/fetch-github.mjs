#!/usr/bin/env node
/**
 * 拉取 GitHub 公开数据，生成 src/data/github.json。
 *
 *   node scripts/fetch-github.mjs
 *   GH_TOKEN=xxx node scripts/fetch-github.mjs   # 有 token 时额度更高
 *
 * 只在构建前跑一次，产物进仓库；页面本身不发起任何网络请求。
 */

import { writeFile, readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const OWNER = process.env.GH_OWNER ?? 'wangsichen222';
const TOKEN = process.env.GH_TOKEN ?? '';
const OUT = path.resolve(process.cwd(), 'src/data/github.json');
const TZ = 'Asia/Shanghai';
const DAY = 86_400_000;

const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'personal-space-build',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function api(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${url}`);
  }
  return res.json();
}

const fmtDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const fmtHour = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hour: '2-digit',
  hour12: false,
});
const fmtWeekday = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' });

async function getAllCommits(repo) {
  const commits = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await api(
      `https://api.github.com/repos/${OWNER}/${repo}/commits?author=${OWNER}&per_page=100&page=${page}`
    );
    commits.push(...batch);
    if (batch.length < 100) break;
  }
  return commits;
}

function streaks(days) {
  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev = null;
  for (const day of sorted) {
    const time = Date.parse(`${day}T00:00:00Z`);
    run = prev !== null && time - prev === DAY ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = time;
  }

  // 当前连续：从最后一次提交日往回数
  let current = 0;
  if (sorted.length) {
    const set = new Set(sorted);
    let cursor = Date.parse(`${sorted.at(-1)}T00:00:00Z`);
    while (set.has(new Date(cursor).toISOString().slice(0, 10))) {
      current += 1;
      cursor -= DAY;
    }
  }
  return { longest, current };
}

async function main() {
  console.log(`→ 读取 ${OWNER} 的公开数据`);

  const [user, repos] = await Promise.all([
    api(`https://api.github.com/users/${OWNER}`),
    api(`https://api.github.com/users/${OWNER}/repos?per_page=100&sort=pushed&type=owner`),
  ]);

  const activeRepos = repos.filter((repo) => !repo.fork && repo.size > 0);
  const commits = [];
  const languages = new Map();
  const repoSummaries = [];

  for (const repo of activeRepos) {
    let repoCommits = [];
    try {
      repoCommits = await getAllCommits(repo.name);
    } catch (error) {
      console.warn(`  ! ${repo.name}: ${error.message}`);
    }

    try {
      const langs = await api(`https://api.github.com/repos/${OWNER}/${repo.name}/languages`);
      for (const [name, bytes] of Object.entries(langs)) {
        languages.set(name, (languages.get(name) ?? 0) + bytes);
      }
    } catch {
      if (repo.language) {
        languages.set(repo.language, (languages.get(repo.language) ?? 0) + 1);
      }
    }

    const latest = repoCommits[0];
    repoSummaries.push({
      name: repo.name,
      description: repo.description ?? '',
      url: repo.html_url,
      stars: repo.stargazers_count,
      language: repo.language ?? '—',
      pushedAt: repo.pushed_at,
      createdAt: repo.created_at,
      commits: repoCommits.length,
      lastMessage: latest ? latest.commit.message.split('\n')[0] : '',
      lastCommitAt: latest ? latest.commit.author.date : null,
    });

    for (const item of repoCommits) {
      commits.push({
        sha: item.sha.slice(0, 7),
        repo: repo.name,
        message: item.commit.message.split('\n')[0],
        date: item.commit.author.date,
      });
    }
  }

  const dailyMap = new Map();
  const hourly = Array.from({ length: 24 }, () => 0);
  const weekday = Array.from({ length: 7 }, () => 0);
  const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (const commit of commits) {
    const date = new Date(commit.date);
    const day = fmtDay.format(date);
    dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
    hourly[Number(fmtHour.format(date)) % 24] += 1;
    const wd = weekdayOrder.indexOf(fmtWeekday.format(date));
    if (wd >= 0) weekday[wd] += 1;
  }

  const days = [...dailyMap.keys()].sort();
  const { longest, current } = streaks(days);
  const totalBytes = [...languages.values()].reduce((sum, n) => sum + n, 0) || 1;

  const payload = {
    fetchedAt: new Date().toISOString(),
    user: {
      login: user.login,
      name: user.name,
      avatar: user.avatar_url,
      bio: user.bio,
      location: user.location,
      createdAt: user.created_at,
      followers: user.followers,
      publicRepos: user.public_repos,
    },
    totals: {
      commits: commits.length,
      activeDays: days.length,
      longestStreak: longest,
      currentStreak: current,
      firstCommit: commits.length ? commits.map((c) => c.date).sort()[0] : null,
      lastCommit: commits.length ? commits.map((c) => c.date).sort().at(-1) : null,
      trackedRepos: activeRepos.length,
    },
    daily: days.map((date) => ({ date, count: dailyMap.get(date) })),
    hourly,
    weekday,
    languages: [...languages.entries()]
      .map(([name, bytes]) => ({
        name,
        bytes,
        percent: Math.round((bytes / totalBytes) * 1000) / 10,
      }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 8),
    repos: repoSummaries.sort((a, b) => b.commits - a.commits),
    recent: commits.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8),
  };

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(
    `✓ 写入 ${path.relative(process.cwd(), OUT)}：${payload.totals.commits} 次提交 / ` +
      `${payload.totals.activeDays} 个活跃日 / ${payload.repos.length} 个仓库`
  );
}

main().catch(async (error) => {
  console.error(`✗ 拉取失败：${error.message}`);
  try {
    const cached = JSON.parse(await readFile(OUT, 'utf8'));
    console.warn(`  沿用已有快照（fetchedAt: ${cached.fetchedAt}）`);
    process.exit(0);
  } catch {
    process.exit(1);
  }
});
