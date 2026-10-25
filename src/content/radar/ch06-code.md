---
title: "模糊函数——离散编码波形 · 代码实践"
titleEn: ""
summary: "Chap 5 讨论了模拟连续波形（LFM、单脉冲等）的模糊函数；本章扩展到离散编码波形 ——把脉宽分为个子脉冲，每个子脉冲有特定的相位或频率。代码侧重点是："
part: "Part II"
chapter: 6
chapterTitle: "模糊函数——离散编码波形"
chapterTitleEn: "Ambiguity Function - Discrete Coded Waveforms"
section: "0"
kind: "code"
order: 6999
tags: ["雷达系统", "第6章", "代码实践"]
source: "《雷达系统分析与设计（MATLAB版）》第 3 版 · 第 6 章代码"
---

## 1. 章节概述

Chap 5 讨论了**模拟连续波形**（LFM、单脉冲等）的模糊函数；本章扩展到**离散编码波形**——把脉宽 $\tau$ 分为 $N$ 个子脉冲，每个子脉冲有特定的相位或频率。代码侧重点是：

- 用 **FFT 频域算法**高效计算离散编码的模糊函数（替代 Chap 5 的双重循环）
- 展示三类重要编码：
  - **Barker 码**（二进制，最佳低旁瓣）
  - **Costas 频率编码**（频率跳变，近似理想图钉）
  - **Frank/P1/P2/P3 码**（多相码，长序列低旁瓣）
- 提供**统一绘图函数** `plot_figures_chap6.m`

学习目标：
1. 掌握离散编码模糊函数的 FFT 实现
2. 理解 Barker 码"已知最优"的旁瓣特性
3. 理解 Costas 序列"理想图钉"的构造原理
4. 熟悉多相码（Frank/P 码）及其多普勒稳健性

## 2. 代码清单表格

| 文件名 | 类型 | 功能简述 | 对应公式/小节 |
|--------|------|---------|---------------|
| `ambiguity_code.m` | 函数 | 任意编码模糊函数（FFT 高效实现） | §6.5 |
| `Barker_ambig.m` | 函数 | Barker 码模糊函数（带绘图） | §6.2 |
| `prn_ambig.m` | 函数 | PRN 码模糊函数（带绘图） | §6.3 |
| `plot_figures_chap6.m` | 函数 | 统一绘图（3D + 切面 + 等高线） | 工具 |
| `Fig6_2.m` | 脚本 | 13 位 Barker 码 | §6.2 |
| `Fig6_3.m` | 脚本 | 20 位扩展 Barker 码 | §6.2 |
| `Fig6_10_13.m` | 脚本 | 13/7/20 位 PRN 码 | §6.3 (Fig 6.8-6.10) |
| `Fig6_15_16.m` | 脚本 | 30/15 位 Costas 频率编码 | §6.4 (Fig 6.15-6.16) |
| `Fig6_17.m` | 脚本 | Frank 多相码 (M=4) | §6.6 (Fig 6.17) |
| `Fig6_20.m` | 脚本 | P 码 (P1/P2/P3) | §6.6 (Fig 6.20) |

## 3. 代码详解

### 3.1 `ambiguity_code.m` — 通用 FFT 模糊函数

**核心思想**：用**频域**实现离散编码的模糊函数，比 Chap 5 的双重循环快几个数量级。

**实现流程**：

```matlab
function [ambig] = ambiguity_code(uinput)
N = size(uinput, 2);
tau = N;

% 10 倍过采样 + 零填充到 2^n
samp_num = size(code, 2) * 10;
n = ceil(log(samp_num) / log(2));
nfft = 2^n;

u(1:nfft) = 0;
for index = 1:10:samp_num
    j = j + 1;
    u(index:index+10-1) = code(j);
end

v = u;                                  % 副本
vfft = fft(v, nfft);

% 对每个多普勒频移计算模糊切面
for freq = -6/tau:freq_del:6/tau
    j = j + 1;
    exf = exp(sqrt(-1) * 2 * pi * freq .* delay);
    u_times_exf = u .* exf;
    ufft = fft(u_times_exf, nfft);
    prod = ufft .* conj(vfft);
    ambig(j, :) = fftshift(abs(ifft(prod)))';
end
```

**核心算法**（离散形式，Eq. 6.X）：

$$
\chi(q, f_d) = \sum_{k=0}^{N-1} u(k) \, u^*(k+q) \, e^{j 2\pi f_d k \Delta t}
$$

**频域实现**（对每个 $f_d$）：

$$
\chi(q, f_d) = \text{IFFT}\left[ \text{FFT}(u(t) e^{j 2\pi f_d t}) \cdot \text{conj}(\text{FFT}(v)) \right]
$$

**关键参数**：
- 10 倍过采样：每个码元扩展为 10 个采样点，提高时延分辨率；
- 零填充到 2 的幂：使 FFT 加速（Cooley-Tukey 算法）；
- $f_d$ 范围 $\pm 6/\tau$：覆盖码元时间倒数尺度。

---

### 3.2 `Barker_ambig.m` — Barker 码专用

**Barker 码定义**：长度 $N$ 的二进制序列 $\pm 1$，满足自相关旁瓣 $\le 1/N$。

**已知 Barker 码长度**：2, 3, 4, 5, 7, 11, 13。**没有找到 13 以上的 Barker 码**——这是公开问题。

**典型 Barker 码**（13 位）：

$$
\pm[1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1]
$$

其自相关函数旁瓣电平为 $\pm 1/13 \approx -22.3$ dB。

**实现**：与 `ambiguity_code.m` 相同，但额外绘制 3 幅图（3D mesh + 零多普勒切面 + 等高线）。

---

### 3.3 `prn_ambig.m` — PRN 码专用

**PRN 码（Pseudo-Random Number）**特征：
- **平衡性**：1 和 -1 数量大致相等；
- **游程性**：连续 1 或 -1 长度很短；
- **自相关**：$\tau=0$ 时尖锐峰值，$\tau\ne 0$ 时旁瓣接近 0；
- **互相关**：两个不同 PRN 码的互相关接近 0。

**用途**：扩频通信、多用户雷达、GPS 信号。

**实现**：与 `ambiguity_code.m` 类似，但 $f_d$ 范围略小（$\pm 4/\tau$），绘图用 `gray` colormap。

---

### 3.4 `plot_figures_chap6.m` — 统一绘图

```matlab
function plot_figures_chap6(ambig, delay, freq)
% Fig 1: 3D mesh
figure
mesh(delay, freq, (ambig ./ max(max(ambig))))
view(-30, 55)
axis tight
ylabel('frequency')
xlabel('delay')
zlabel('ambiguity function')

% Fig 2: 零多普勒切面
figure
Nhalf = (size(ambig, 1) - 1) / 2;
plot(delay, ambig(Nhalf+1, :) / (max(max(ambig))), 'k')

% Fig 3: 等高线
figure
contour(delay, freq, (ambig ./ max(max(ambig))))
```

**作用**：把"模糊函数矩阵"统一转化为可发布的 3 幅图（3D / 距离切面 / 等高线），所有 `Fig*` 脚本都调用它。

---

### 3.5 `Fig6_2.m` — 13 位 Barker 码

```matlab
uinput = [1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1];   % 21 位 (含 0 间隔?)
[ambig] = ambiguity_code(uinput);
plot_figures_chap6(ambig, delay, freq)
```

**注意**：原代码中 `uinput` 长度为 21，似乎是 13 位 Barker 码 + 间隔 0 + 8 位补 0 的组合。**这看起来不太标准**，教材可能使用某种"分段重复"形式。

---

### 3.6 `Fig6_3.m` — 20 位扩展 Barker 码

```matlab
uinput = [1 0 0 1 0 1 0 0 0 0 0 1 0 0 1 0 0 0 0 0 1];  % 21 位
```

同理，长度 21，包含间隔。

---

### 3.7 `Fig6_10_13.m` — PRN 码三种长度

分别计算：
1. 13 位 PRN 码（图 6.8）；
2. 7 位 Barker 码（图 6.9）；
3. 20 位 PRN 码（图 6.10）。

**教学要点**：对比不同长度的"距离-多普勒"模糊图。

---

### 3.8 `Fig6_15_16.m` — Costas 频率编码

**Costas 序列**：一种特殊的频率跳变序列，构造基于有限域 $GF(p)$ 的对数/指数映射。

**特性**：模糊函数在 $(\tau, f_d)$ 平面上**除原点外几乎处处均匀**——接近"理想图钉"。

**两个示例**：
- 30 位 Costas 码（图 6.15）；
- 15 位 Costas 码（图 6.16）。

**优势**：相比 Barker 码，Costas 在时延-多普勒二维平面上同时具有低旁瓣。

**注意**：这里 `uinput` 元素为 $\pm 1$（不是频率值），是 Costas 序列经"频率→相位"映射后的二进制表示。具体的 Costas 构造需要在 `prn_ambig` 之前完成频率序列生成。

---

### 3.9 `Fig6_17.m` — Frank 码

**Frank 码**（多相码）：
- 总长 $N = M^2$，$M$ 为台阶数；
- 相位矩阵 $\phi(i, j) = (2\pi/M) \cdot i \cdot j$，$i, j = 0, 1, ..., M-1$。

**本例**：$M = 4$，共 16 个子脉冲：
$$
u = [1, 1, 1, 1, 1, i, -1, -i, 1, -1, 1, -1, 1, -i, -1, i]
$$

**优势**：
- 旁瓣低（接近 $-1/N$ 量级）；
- 较 Barker 码可构造更长的码；
- **多普勒稳健性**：相比 LFM，Frank 码对多普勒失配不那么敏感。

---

### 3.10 `Fig6_20.m` — P 码 (P1/P2/P3)

**P 码**家族：
- **P1 码**：Frank 码的循环移位；
- **P2 码**：对多普勒失配的改进；
- **P3 码**：基于 LFM 采样。

**代码**：
```matlab
U = [1 1 1 1 1 i -1 -i 1 -1 1 -1 1 -i -1 i];
ambiguity = ambiguity_code(U);
```

注：本文件**未调用 `plot_figures_chap6`**，只计算了模糊函数，没有绘图（可能是不完整的示例）。

---

## 4. 代码串联叙述

本章代码围绕**"任意离散编码的模糊函数"**这一通用工具展开，形成"算法核心 + 多种编码应用 + 统一绘图"的清晰层次。

### 主线一：通用算法 → 多场景应用

`ambiguity_code.m` 是**通用底层**——任意输入向量 $u$，输出其模糊函数矩阵。

基于这个底层，构造了多个**专题函数**：
- `Barker_ambig.m`：专门针对 Barker 码，含绘图；
- `prn_ambig.m`：专门针对 PRN 码，含绘图。

这种"通用 + 专用"的代码结构非常**工程友好**——既能复用于各种编码，又对常见编码提供"一键出图"的便利。

### 主线二：Barker 码 → "已知最优"低旁瓣

`Fig6_2.m` 和 `Fig6_3.m` 展示 Barker 码——这是**经典低旁瓣二进制编码**。

**关键事实**：
- 已找到的最长 Barker 码是 13 位；
- 自相关旁瓣 $\le 1/13$ ≈ -22.3 dB；
- 找不到更长的 Barker 码是**已知的公开问题**。

工程意义：Barker 码适合**短码**场景（距离分辨率要求不高），长码需用 Frank/P 码或 Gold 码。

### 主线三：PRN 码 → 任意长度的低旁瓣

`Fig6_10_13.m` 展示 PRN 码——可构造**任意长度**（13/7/20）的低旁瓣序列。

**PRN vs Barker**：
| 特性 | Barker | PRN |
|------|--------|-----|
| 长度 | 最多 13 位 | 任意 |
| 旁瓣 | $\le 1/N$ | 接近 0（统计意义） |
| 互相关 | 不一定 | 接近 0 |
| 用途 | 单用户雷达 | 多用户/扩频 |

### 主线四：Costas 码 → "理想图钉"

`Fig6_15_16.m` 展示 Costas 频率编码——**二维低旁瓣**（时延+多普勒同时）。

**构造原理**：基于有限域 $GF(p)$ 的对数/指数映射，确保**不同时间片使用不同频率**且**任意两时间片的频率差不重复**。

**优势**：在 $(\tau, f_d)$ 平面上是**最接近理想图钉**的离散编码。

### 主线五：Frank/P 码 → 长码 + 多普勒稳健

`Fig6_17.m`（Frank 16 位）+ `Fig6_20.m`（P 码）展示多相码。

**共同特点**：
- 长度可达 $M^2$（如 $M=10$ 即 100 位）；
- 旁瓣极低；
- 相比纯相位调制，**对多普勒频移不敏感**。

**应用**：现代雷达（特别是 SAR、PD 雷达）广泛使用多相码。

### 主线六：统一绘图

`plot_figures_chap6.m` 是**"出版级"绘图工具**——3 幅图（3D / 切面 / 等高线），标准化输出。

这种"工具分离"的设计是**大型项目的最佳实践**：核心算法 + 标准接口 + 多种应用 + 统一可视化。

---

## 5. 关键公式汇总

### 5.1 离散模糊函数定义（§6.5）

$$
\chi(q, f_d) = \sum_{k=0}^{N-1} u(k) u^*(k+q) e^{j 2\pi f_d k \Delta t}
$$

其中 $u(k)$ 是离散编码，$q$ 是时延索引，$f_d$ 是多普勒频移。

### 5.2 频域实现

$$
\chi(q, f_d) = \text{IFFT}\left[\text{FFT}\left(u(k) e^{j 2\pi f_d k \Delta t}\right) \cdot \text{conj}(\text{FFT}(u))\right]
$$

### 5.3 Barker 码自相关

$$
R(\tau) = \begin{cases} N, & \tau = 0 \\ \pm 1, & \tau \ne 0 \end{cases}
$$

旁瓣电平 $\le 1/N$（已知最优）。最长已知 Barker 码 = 13 位。

### 5.4 Costas 序列构造

对于素数 $p$，Costas 序列 $c_n$ 满足：

$$
c_n = \alpha^{g^n \mod p}, \quad g \text{ 是原根}, \quad n = 0, 1, ..., p-2
$$

**关键约束**：对任意 $i \ne j$，$(c_{i+m} - c_i) = (c_{j+m} - c_j)$ 当且仅当 $i = j$。

### 5.5 Frank 码相位（§6.6）

$$
\phi(i, j) = \frac{2\pi}{M} \cdot i \cdot j, \quad i, j = 0, 1, ..., M-1
$$

总长 $N = M^2$。例：$M=4$ → 16 位。

### 5.6 P1/P2/P3 码

- **P1**：$\phi(i, j) = -\pi[M - (2j - 1)] \cdot [(j-1) \mod M] + \pi(M-1)i^2 / M$
- **P2**：对 P1 的多普勒稳健性改进
- **P3**：$\phi(i) = \pi \cdot i^2 / N$（基于 LFM）

### 5.7 距离分辨率（编码波形）

$$
\Delta R = \frac{c}{2 N \Delta t}
$$

其中 $N$ 是码长，$\Delta t$ 是子脉冲宽度。

### 5.8 距离压缩处理增益

$$
G_{\text{PC}} = 10 \log_{10}(N) \quad [\text{dB}]
$$

---

## 6. 章节总结

### 核心学习要点

1. **FFT 加速**：用频域算法把模糊函数计算从 $O(N^2)$ 降到 $O(N \log N)$，是工程实现的关键；
2. **Barker 码的最佳性**：$\le 1/N$ 旁瓣，已知最长 13 位；
3. **PRN 码的灵活性**：任意长度 + 接近 0 的旁瓣（统计意义），代价是旁瓣不一定严格 $\le 1/N$；
4. **Costas 码的"理想图钉"**：在 $(\tau, f_d)$ 二维同时低旁瓣，是频率编码的最佳选择；
5. **多相码的工程价值**：可构造长码（数百位）+ 良好的多普勒稳健性，现代雷达的核心编码。

### 实践建议

- **运行 `Fig6_2.m`、`Fig6_3.m`、`Fig6_10_13.m`**，对比 Barker 与 PRN 的旁瓣形状；
- **运行 `Fig6_15_16.m`**，观察 Costas 码"图钉状"模糊图——直观理解其优势；
- 修改 `ambiguity_code.m` 的输入（如 `[1 1 -1 -1 1 -1 1 1]`），看模糊图如何变化；
- **思考**：
  - 为什么 Barker 码找不到更长的？
  - 同样的 13 位长度下，Barker 码和 PRN 码哪个旁瓣更低？理论极限是多少？
  - Costas 序列的"理想图钉"在工程上是否真的最优？考虑实际目标多普勒范围。

### 与后续章节的联系

- **Chap 7**（脉冲压缩）：把本章的"编码"工程化为实际可压缩的脉冲——Stretch 处理、SFW 脉冲串；
- **Chap 8**（雷达波传播）：实际雷达回波会有失真（多径、衰减），需评估编码对失真的稳健性；
- **Chap 11-13**（检测理论）：离散编码的旁瓣电平直接影响**虚警概率**和**检测概率**；
- **Chap 17**（目标跟踪）：PRN 码的多用户特性允许多目标同时跟踪。

Chap 6 是**波形设计**章节的"算法库"——后续所有波形相关的工作都基于此。
