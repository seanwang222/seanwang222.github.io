---
title: 把冲突决策抽成纯函数
summary: 同步代码最怕「判断和执行混在一起」。把判断抽成 planPull / planPush，就能脱离网络与磁盘测试它。
date: 2026-10-12
tags: [同步, 架构, 数据安全]
kind: note
source: DayMark
---

同步逻辑通常长这样：读本地、读云端、比时间、决定方向、执行、写回。五个步骤挤在一个函数里，于是你没法单独验证「比较」这一步是否合理——要测它，得先造一个云端。

## 拆法

把「要不要动手」和「怎么动手」分开：

```js
// 纯函数：只吃数据，吐决策，不碰网络与磁盘
function planPull(local, remote) {
  if (!remote) return { action: 'noop', reason: 'remote-empty' };
  if (!local) return { action: 'apply' };
  if (remote.updatedAt > local.updatedAt) return { action: 'apply' };
  if (remote.updatedAt < local.updatedAt) return { action: 'block', reason: 'local-newer' };
  return { action: 'noop', reason: 'same' };
}
```

主进程只负责执行 `action`。测试时直接喂对象，不需要启动任何服务。

## 纯函数化之后才看得见的三个问题

**1. 「为空」的两个方向不对称**

`remote` 为空意味着云端没数据，可以上传；`local` 为空则不一定是「没有数据」，可能是「还没回填」。这个不对称在混写时被抹平了，抽出来以后一眼看见：

> 只判断内容，不判断上下文，是丢数据的经典起点。

这条直接推着 [[ready-gate]] 从一个布尔量变成显式状态。

**2. 覆盖前必须先留档**

决策函数返回 `apply` 之前，另一步是「把将被覆盖的那一份存到 conflict-*.json」。留档不是备份策略，是决策的一部分——因为「覆盖」这个动作不可逆，而 `updatedAt` 可能因为时区或时钟漂移而说谎。

**3. 相同时间戳不要重复上传**

`same` 分支早期直接走了 PUT。结果是每次自动同步都往云端写一遍同样的内容，白白触发限流。加上 `noop` 分支后，网络请求数下降一个量级。

## 自动同步是双向的，只是永不带 force

这点容易自我欺骗：README 写着「自动同步只上传，不会覆盖本机」，实现里却带着 apply 分支。所谓「不带 force」指的是——遇到本地较新就停下，而不是永不下载。

正确表述是：**自动同步会下载，但在会丢较新数据时停下来问人**。

## 顺序上还有一个坑

读本地必须放在 `await` 网络之后：

```js
const remote = await fetchRemote();   // 先等网络
const local = readLocal();            // 再读本机
```

反过来的话，网络等待期间用户改的数据会被读到的旧快照覆盖回去。等待窗口越长，丢得越多。这条和 [[atomic-write]] 属于同一类错误：**用旧状态做了一次看起来无害的写**。
