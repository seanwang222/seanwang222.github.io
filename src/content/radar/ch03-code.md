---
title: "线性系统与复信号表示 · 代码实践"
titleEn: ""
summary: "本章是雷达信号处理的数学基础章节，主要内容："
part: "Part II"
chapter: 3
chapterTitle: "线性系统与复信号表示"
chapterTitleEn: "Linear Systems and Complex Signal Representation"
section: "0"
kind: "code"
order: 3999
tags: ["雷达系统", "第3章", "代码实践"]
source: "《雷达系统分析与设计（MATLAB版）》第 3 版 · 第 3 章代码"
---

## 1. 章节概述

本章是雷达信号处理的**数学基础**章节，主要内容：

- **复信号表示**：实带通信号 $\Leftrightarrow$ 等效复包络
- **线性系统**：LTI 系统的冲激响应、卷积、傅里叶变换
- **LFM 波形**：线性调频连续波 (Linear Frequency Modulation) 的时域/频域特性
- **匹配滤波器的准备**：副本信号 (replica) 的构造
- **窗函数**：时域加窗在频域的影响（旁瓣抑制 vs. 主瓣展宽）

Chap 3 的代码虽然数量不多（仅 3 个），但都是**承上启下**的关键：
- `Fig3_6.m`：展示 LFM 信号形式（脉冲压缩波形基础）
- `Fig3_8.m`：构造副本信号（匹配滤波器输入）
- `Fig3_10_13.m`：分析窗函数（脉冲压缩副瓣控制）

## 2. 代码清单表格

| 文件名 | 类型 | 功能简述 | 对应公式/小节 |
|--------|------|---------|---------------|
| `Fig3_6.m` | 脚本 | LFM 上/下啁啾信号波形 | §3.3 LFM 信号 |
| `Fig3_8.m` | 脚本 | LFM 副本信号的实部/虚部/频谱 | §3.3 + §4.2 匹配滤波 |
| `Fig3_10_13.m` | 脚本 | 4 种窗函数的频谱对比 | §3.4 窗函数 |

## 3. 代码详解

### 3.1 `Fig3_6.m` — LFM 波形与匹配滤波器副本

**核心内容**：上啁啾（up-chirp）LFM 信号 $\Leftrightarrow$ 它的匹配滤波器副本（下啁啾 down-chirp）。

**数学公式**：

上啁啾 LFM 信号：
$$
s(t) = \exp\left(j \pi \beta t^2\right), \quad 0 \le t \le \tau
$$

其中 $\beta = B / \tau$ 是**调频斜率**（Hz/s），$B$ 是扫频带宽，$\tau$ 是脉宽。

瞬时频率：
$$
f(t) = \frac{1}{2\pi} \frac{d\phi(t)}{dt} = \beta t
$$

匹配滤波器时域冲激响应（按"翻转+共轭"规则）：
$$
h(t) = s^*(-t) = \exp\left(-j \pi \beta t^2\right)
$$

**关键参数**：$B = 15$ MHz，$\tau = 1$ μs，$\beta = 15 \times 10^{12}$ Hz/s，$t_s = 1$ ns。

**实现**：
```matlab
% 上啁啾
t = 0 : ts : +tau;
S = exp(j*pi*beta*(t.^2));

% 下啁啾（匹配滤波器）
t = -tau : ts : 0;
Smf = exp(-j*pi*beta*(t.^2));
```

**物理含义**：上啁啾经过匹配滤波器（"卷积一个翻转共轭的副本"）后，输出是一个压缩脉冲。这一过程将在 Chap 4-7 中详细展开。

---

### 3.2 `Fig3_8.m` — 副本信号的多视图与回波构造

**核心内容**：以 3 个 figure 展示 LFM 副本信号的实部、虚部、频谱；并构造多散射体回波。

**LFM 副本（频域窄带、带通）**：

```matlab
t = linspace(-taup/2, taup/2, n);
replica = exp(i * pi * (b/taup) .* t.^2);
```

**频谱**（近似矩形）：

```matlab
sampling_interval = 1 / 2.5 / b;
freqlimit = 0.5 / sampling_interval;
freq = linspace(-freqlimit, freqlimit, n);
plot(freq, fftshift(abs(fft(replica))))
```

**为什么是矩形？** LFM 信号是"频率随时间线性扫过 $[0, B]$"的信号，在一个长脉冲内每个频率停留的时间近似相等，因此频谱幅度在 $[0, B]$ 内近似均匀——这就是**时宽带宽积 $BT$ 足够大**时 LFM 频谱呈矩形的物理原因。代码中有 BT 检查：

```matlab
time_B_product = b * taup;
if(time_B_product < 5)
    fprintf('************ Time Bandwidth product is TOO SMALL ***************')
    return
end
```

**多散射体回波构造**：

```matlab
nscat = 2;
scat_range = [15 25];   % 距离 [m]
scat_rcs = [1 2];       % RCS [m^2]

for j = 1:1:nscat
   range = scat_range(j);
   x(j, :) = scat_rcs(j) .* exp(i * pi * (b/taup) .* (t + (2*range/c)).^2);
   y = x(j, :) + y;
end
```

回波形式是 $\sigma \cdot s(t - 2R/c)$，即**距离时延 $2R/c$** 后的副本信号。

**窗函数选择**：
```matlab
if(winid == 0)  win = ones(1, n); end                % 矩形
if(winid == 1)  win = hamming(n)'; end              % Hamming
if(winid == 2)  win = kaiser(n, pi)'; end            % Kaiser(pi)
if(winid == 3)  win = chebwin(n, 60)'; end           % Chebyshev 60dB
```

**与 Chap 4 的衔接**：本文件末尾的注释明确说"完整匹配滤波处理见 `matched_filter.m`"，说明本文件是**Chap 4 的预习**。

---

### 3.3 `Fig3_10_13.m` — 窗函数频谱对比

**核心内容**：把 4 种窗函数（Rect、Hamming、Hanning、Kaiser）变换到频域，比较它们的**主瓣宽度**和**旁瓣电平**。

**FFT 准备**：
```matlab
N = 32;
win_rect  = ones(1, N);
win_ham   = hamming(N);
win_han   = hanning(N);
win_kaiser = kaiser(N, pi);
win_kaiser2 = kaiser(N, 5);

Yrect = abs(fft(win_rect,  256));  Yrectn = Yrect ./ max(Yrect);  % 补零到 256，归一化
```

**dB 显示**：
```matlab
plot(20*log10(Yrectn + eps), 'k')   % eps 防止 log(0)
```

**窗函数特性总结**：

| 窗函数 | 主瓣宽度 | 旁瓣电平 | 适用场景 |
|--------|---------|---------|---------|
| Rect | 最窄 | -13 dB | 距离分辨率优先 |
| Hanning | 中 | -31 dB | 通用 |
| Hamming | 2×Rect | -43 dB | 通用、副瓣低 |
| Kaiser($\beta=\pi$) | 较宽 | -46 dB | 副瓣更低 |
| Kaiser($\beta=5$) | 中 | -57 dB | 极低副瓣 |
| Chebyshev (60dB) | 较宽 | -60 dB | 严格副瓣约束 |

**设计哲学**：
- **窄主瓣** ⇔ 高距离分辨率；
- **低旁瓣** ⇔ 强目标不掩盖弱目标；
- **二者不可兼得**——必须通过参数（Kaiser $\beta$、Hamming 等）权衡。

---

## 4. 代码串联叙述

本章三个脚本构成一个**递进的逻辑链**：

### 第一步：理解 LFM 的"长相"（Fig3_6.m）

`Fig3_6.m` 是最直观的入门：把"上啁啾"和"下啁啾"画在同一张图上。学习者一眼就能看出**LFM 信号的频率是线性变化的**——肉眼上是一个"越来越密"的正弦波。这是脉冲压缩的物理基础。

### 第二步：理解匹配滤波器的输入（Fig3_8.m）

`Fig3_8.m` 把"副本信号"立体化：
- **时域实部、虚部** → 了解 LFM 是复信号；
- **频域幅度** → 频谱近似矩形，为"匹配滤波 = 频域相乘"做铺垫；
- **多散射体回波** → 模拟雷达接收到的实际信号。

末尾的 `return` 与注释 "完整匹配滤波处理见 matched_filter.m" 是有意为之——**留白**到下一章。

### 第三步：理解窗函数的权衡（Fig3_10_13.m）

`Fig3_10_13.m` 跳出 LFM，进入更一般的**频谱整形**话题。四幅子图并排展示，传递的核心信息是：

> **任何时域操作（加窗）都会在频域付出代价（主瓣展宽）。**

这一原则在 Chap 7（脉冲压缩的副瓣控制）和 Chap 16（自适应波束形成）中都会反复出现。

### 三者合起来：Chap 3 是"信号层"基础

- **Fig3_6**：信号**形式**
- **Fig3_8**：信号**测量**
- **Fig3_10_13**：信号**整形**

这三个角度，恰好对应了 Chap 4（匹配滤波）、Chap 5（模糊函数）、Chap 7（脉冲压缩工程实现）的预备知识。

---

## 5. 关键公式汇总

### 5.1 LFM 信号（Up-chirp）

$$
s(t) = \exp\left(j \pi \beta t^2\right), \quad 0 \le t \le \tau
$$

$$
\beta = B / \tau, \quad f_i(t) = \beta t
$$

### 5.2 匹配滤波器时域冲激响应

$$
h(t) = s^*(t_0 - t) = k \cdot s^*(-t) \quad (\text{对 LFM})
$$

### 5.3 匹配滤波输出（时域卷积）

$$
y(t) = s(t) * h(t) = \int s(\tau) h(t - \tau) d\tau
$$

### 5.4 多散射体回波

$$
y(t) = \sum_{j=1}^{N} \sigma_j \cdot s\left(t - \frac{2 R_j}{c}\right)
$$

### 5.5 时宽带宽积条件

$$
BT = B \cdot \tau \gtrsim 5 \quad (\text{LFM 频谱近似矩形的条件})
$$

### 5.6 窗函数频域关系

$$
Y(f) = W(f) \otimes X(f)
$$

- 加窗 $\Leftrightarrow$ 频域卷积
- 主瓣宽度：Rect < Hanning $\approx$ Hamming < Kaiser
- 旁瓣电平：Rect > Hanning > Hamming > Kaiser($\pi$) > Chebyshev

### 5.7 复信号表示（背景）

实带通信号：
$$
\tilde{x}(t) = \text{Re}\{x(t) e^{j 2\pi f_0 t}\}, \quad x(t) = |x(t)| e^{j \psi(t)}
$$

其中 $x(t)$ 是**复包络**，$|x(t)|$ 是幅度，$\psi(t)$ 是相位。

---

## 6. 章节总结

### 核心学习要点

1. **LFM 信号的复数表示**：理解 $\exp(j\pi \beta t^2)$ 的 I/Q 两路；
2. **匹配滤波器的"时反+共轭"规则**：$h(t) = s^*(-t)$，这是 Chap 4 的核心；
3. **频谱的工程化近似**：$BT$ 足够大时，LFM 频谱近似矩形，这是匹配滤波"积分"过程的几何解释；
4. **窗函数的权衡**：主瓣宽度 vs. 旁瓣电平——这是数字信号处理中**无处不在的折中**。

### 实践建议

- **运行 `Fig3_6.m`**，观察上下啁啾的对称性，把"线性调频"这个抽象名词变成肉眼可见的波形；
- 修改 `Fig3_8.m` 中的 $b$、$\tau$，体会 $BT$ 对频谱矩形度的影响；
- 跑 `Fig3_10_13.m` 时切换不同的窗（修改 `winid`），观察主瓣/旁瓣权衡；
- 思考：**为什么 LFM 频谱是矩形的？** 提示——驻留时间分布。

### 与后续章节的联系

- **Chap 4**：将在 Fig3_8 副本信号基础上实现**匹配滤波器**，给出 SNR 最大化的严格证明；
- **Chap 5**：将在 LFM 基础上定义**模糊函数**，分析时延-多普勒耦合；
- **Chap 7**：将利用 Chap 3 介绍的窗函数实现**脉冲压缩副瓣抑制**（Hamming 加权等）。

本章是连接 Chap 2（能量方程）与 Chap 4-7（信号处理）的**数学桥梁**。
