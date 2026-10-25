---
title: "匹配滤波器雷达接收机 · 代码实践"
titleEn: ""
summary: "匹配滤波器（Matched Filter）是雷达信号处理的核心——它使输出 SNR 最大化，是脉冲压缩技术的数学基础。本章 6 个代码文件覆盖："
part: "Part II"
chapter: 4
chapterTitle: "匹配滤波器雷达接收机"
chapterTitleEn: "The Matched Filter Radar Receiver"
section: "0"
kind: "code"
order: 4999
tags: ["雷达系统", "第4章", "代码实践"]
source: "《雷达系统分析与设计（MATLAB版）》第 3 版 · 第 4 章代码"
---

## 1. 章节概述

**匹配滤波器（Matched Filter）** 是雷达信号处理的核心——它使输出 SNR 最大化，是脉冲压缩技术的数学基础。本章 6 个代码文件覆盖：

- 匹配滤波器的**实现**（时域相关 / 频域相乘）
- **LFM 副本信号**的构造（与 Chap 3 衔接）
- **多散射体回波**的合成
- **失配损失**的演示
- **GUI 交互**工具
- 模糊函数预备（高斯脉冲）

学习目标：
1. 理解匹配滤波器的"互相关"实现
2. 掌握频域快速实现（FFT/IFFT）
3. 了解失配对压缩脉冲的影响
4. 熟悉窗函数在脉冲压缩中的作用

## 2. 代码清单表格

| 文件名 | 类型 | 功能简述 | 对应公式/小节 |
|--------|------|---------|---------------|
| `matched_filter.m` | 函数 | 匹配滤波器核心实现（多目标/多窗） | Eq. 4.20, §4.2 |
| `mf3.m` | 脚本 | 3 个目标的频域脉冲压缩 | §4.2 (频域实现) |
| `mismatch.m` | 脚本 | 失配损失演示（频率/带宽失配） | §4.4 失配分析 |
| `addnoise.m` | 函数 | 给轨迹添加高斯测量噪声 | 工具 (Chap 17 用) |
| `Gaussian.m` | 函数 | 高斯脉冲模糊函数 | §4.3 模糊函数预备 |
| `matched_filter_gui.m` | 函数 | 匹配滤波器 GUI 启动 | 工具 |

> 注：`addnoise.m` 和 `Gaussian.m` 严格来说不在 Chap 4 的核心范围，前者是 Chap 17（目标跟踪）的工具，后者是 Chap 5（模糊函数）的预备，但代码都放在 Chap 4 文件夹中。

## 3. 代码详解

### 3.1 `matched_filter.m` — 匹配滤波器核心实现

**功能**：完整的 LFM 脉冲压缩处理器，支持多散射体、多窗函数。

**核心算法**：

```matlab
% 1. 构造 LFM 副本
t = linspace(-taup/2, taup/2, n);
replica = exp(i * pi * (b/taup) .* t.^2);

% 2. 构造多散射体回波
for j = 1:1:nscat
   range = scat_range(j);
   x(j, :) = scat_rcs(j) .* exp(i * pi * (b/taup) .* (t + (2*range/c)).^2);
   y = x(j, :) + y;
end

% 3. 时域加窗
y = y .* win;

% 4. 匹配滤波（互相关）
out = xcorr(replica, y);
out = out ./ n;
```

**核心概念**：

- **时域**：匹配滤波 = 互相关 $\text{out}(t) = \int s(\tau) y(t-\tau) d\tau$
- **频域**：等价于 $\text{out} = \text{IFFT}(\text{FFT}(s^*) \cdot \text{FFT}(y))$

**距离分辨率**：

```matlab
delr = c/2/b;    % 距离分辨率
```

$$
\Delta R = \frac{c}{2B}
$$

其中 $B$ 是 LFM 带宽——这是脉冲压缩雷达提高距离分辨率的关键。

**窗函数选择**（4 种）：
- `winid=0`：无窗（主瓣最窄，旁瓣 -13 dB）
- `winid=1`：Hamming（旁瓣 -43 dB）
- `winid=2`：Kaiser($\pi$)（旁瓣约 -46 dB）
- `winid=3`：Chebyshev(-60 dB)（极低旁瓣）

**调用示例**：
```matlab
y = matched_filter(2, 10e-6, 40e6, 50, [15 25], [1 2], 1);
% 2 个散射体，脉宽 10us，带宽 40MHz，接收窗 50m，距离 [15 25]m
% RCS [1 2]，Hamming 窗
```

---

### 3.2 `mf3.m` — 3 个目标的频域脉冲压缩

**与 `matched_filter.m` 的区别**：纯**频域实现**，不调用 `xcorr`，而是 `FFT → 共轭相乘 → IFFT`。这正是工程实际的做法（频域计算量 $O(N \log N)$ vs. 时域 $O(N^2)$）。

**核心代码**：

```matlab
% 1. 构造副本（时域 + Blackman 窗）
replica = zeros(1, accumulator_samples);
for k = 1:replica_samples
    replica(k) = window(k) * exp(i * pi * (bandwidth/pulsewidth) * t_replica(k)^2);
end
% 2. FFT 到频域
replica = fft(replica);

% 3. 构造回波并 FFT
received = zeros(1, accumulator_samples);
for i_t = 1:num_targets
    t1 = fix(2*target_range(i_t) / (sample_interval*c)) + 1;
    t2 = t1 + replica_samples - 1;
    % ... 边界检查 ...
    for k = t1:t2
        received(accumulator_samples - k + 1) = ...
            received(accumulator_samples - k + 1) + ...
            target_rcs(i_t) * exp(-i * pi * (bandwidth/pulsewidth) * t_replica(m)^2);
    end
end
received = fft(received);

% 4. 频域匹配滤波
y = replica .* received;
y(:, accumulator_samples + 1:fftsize) = 0;   % 补零
out = ifft(y);
```

**关键点**：
- 回波是**延迟副本的共轭** `exp(-j...)`（区别于副本的 `exp(+j...)`），因为时延 $2R/c$ 引起相位翻转；
- `accumulator_samples - k + 1` 是**倒序**填入——为后续 IFFT 后得到正确的距离序列；
- `fftsize` 通常 > `accumulator_samples`（补零到 2 的幂以加速 FFT）。

**示例参数**：
- 带宽 $B = 10$ MHz
- 载频 $f_0 = 9.5$ GHz
- 脉宽 $\tau = 10$ μs
- 3 个目标：200 m, 2000 m, 4000 m
- RCS：25, 10, 25 m²
- A/D 采样率 20 MHz

**距离分辨率验证**：
$$
\Delta R = \frac{c}{2B} = \frac{3 \times 10^8}{2 \times 10^7} = 15 \text{ m}
$$

观察结果会发现，**200 m 与 4000 m 目标能被清晰分辨**（间隔 1800 m $\gg$ 15 m），而不同 RCS 反映在峰值高度上。

---

### 3.3 `mismatch.m` — 失配损失分析

**功能**：演示当回波与匹配滤波器副本不完全一致时，压缩脉冲的变化。

**三种情况**：
1. **图 1（完美匹配）**：副本和回波都是 `chirp(0→20 Hz, 0.25s)`；
2. **图 2（频率失配）**：副本 `0→20 Hz`，回波 `0→21 Hz`；
3. **图 3（带宽+脉宽失配）**：副本 `0→20 Hz @ 0.25s`，回波 `0→20 Hz @ 0.26s`。

**实现**：
```matlab
% 完美匹配
y = chirp(t, 0, 0.25, 20);
yfft = fft(y, 512);
ycomp = fftshift(abs(ifft(yfft .* conj(yfft))));   % 自相关

% 失配 1
y1 = chirp(t, 0, 0.25, 21);
y1comp = fftshift(abs(ifft(y1fft .* conj(yfft))));  % 用 y 的副本
```

**输出**：归一化压缩脉冲的 dB 形式。

**失配效果**：
- 完美匹配：单一主峰，旁瓣低；
- 失配 1：主峰下降，主瓣展宽；
- 失配 2：主峰进一步下降，旁瓣抬高。

**物理含义**：多普勒频移（目标运动）会引入这种失配——这是 Chap 5（模糊函数）要深入讨论的话题。

---

### 3.4 `addnoise.m` — 轨迹加噪

**功能**：在球坐标上加入高斯测量噪声，然后转回直角坐标。

**实现**：
```matlab
for loop = 1:size(trajectory, 2)
   x = trajectory(1, loop);
   y = trajectory(2, loop);
   z = trajectory(3, loop);
   
   azimuth_corrupted   = atan2(y, x) + sigmaaz    * randn(1);
   elevation_corrupted = atan2(z, sqrt(x^2 + y^2)) + sigmael * randn(1);
   range_corrupted     = sqrt(x^2 + y^2 + z^2) + sigmarange * randn(1);
   
   x_corrupted = range_corrupted * cos(elevation_corrupted) * cos(azimuth_corrupted);
   y_corrupted = range_corrupted * cos(elevation_corrupted) * sin(azimuth_corrupted);
   z_corrupted = range_corrupted * sin(elevation_corrupted);
   noisytraj(:, loop) = [x_corrupted; y_corrupted; z_corrupted];
end
```

**使用场景**：Chap 17（目标跟踪）的 Kalman 滤波器测试。

**注意事项**：
- 球坐标加噪是**近似**——大 SNR 时成立；
- 如果目标非常近（z ≪ r），俯仰角误差会被放大；
- 距离噪声独立于角度噪声。

---

### 3.5 `Gaussian.m` — 高斯脉冲模糊函数

**功能**：计算高斯脉冲的模糊函数（双线性调频/Linear FM 类）。

**实现**：
```matlab
function x = Gaussian(taup, sigma)
eps = 0.000001;
sigma = 1;       % 覆盖输入
del = 2*taup/200;
for tau = -taup:del:taup
   i = i + 1;
   fd = linspace(-5/taup, 5/taup, 201);
   val1 = exp(-tau^2/4*sigma);                        % 注：可能笔误
   val2 = exp(-pi*pi .* fd .* fd * sigma * sigma);
   val3 = exp(sqrt(-1) * pi * fd * tau);
   x(:, i) = abs(val1) .* abs(val2) .* abs(val3);
end
```

**数学公式**（理论值）：

高斯脉冲 $s(t) = \exp(-t^2 / 4\sigma)$ 的模糊函数为：

$$
|\chi(\tau, f_d)| = \exp\left(-\frac{\tau^2}{4\sigma}\right) \cdot \exp\left(-\pi^2 f_d^2 \sigma^2\right)
$$

**注意**：代码中 `val1 = exp(-tau^2/4*sigma)` 的优先级是 `(tau^2/4)*sigma`，教材应为 `tau^2/(4*sigma)`。这是一个**潜在的笔误**。

**应用**：高斯脉冲是**唯一没有距离-多普勒耦合**的波形（它的模糊函数是二维高斯），常作为理想基准。

---

### 3.6 `matched_filter_gui.m` — 交互式 GUI

**功能**：MATLAB GUIDE 生成的 GUI 入口，提供 7 个参数输入框和实时绘图。

**GUI 输入框**：
| 输入 | 含义 |
|------|------|
| edit1 | 散射体数量 |
| edit2 | 脉宽 |
| edit3 | 调频带宽 |
| edit4 | 接收窗口 |
| edit5 | 散射体距离向量 |
| edit6 | 散射体 RCS |
| edit7 | 窗类型 |

**使用流程**：
1. 启动 GUI（运行 `matched_filter_gui`）；
2. 填入参数；
3. 点击运行（togglebutton3）；
4. GUI 调用 `matched_filter.m`，显示 4 幅子图（副本时域、副本频谱、回波、压缩输出）。

---

## 4. 代码串联叙述

本章代码可视为**一条从理论到工程的主线**：

### 主线一：实现"匹配"的核心算法

`matched_filter.m` 和 `mf3.m` 提供了**两种实现**：
- `matched_filter.m`：**时域**（用 `xcorr`），直观、易理解；
- `mf3.m`：**频域**（用 FFT/IFFT），高效、工程实用。

二者**数学等价**：

$$
y(t) = s(t) * h(t) = \int s(\tau) h(t-\tau) d\tau \quad \Leftrightarrow \quad Y(f) = S(f) H(f)
$$

### 主线二：理解"失配"的后果

`mismatch.m` 从反面验证匹配滤波器的**敏感性**：
- 当目标多普勒频移不为 0 时（目标运动），"完美匹配"被破坏；
- 失配导致 **SNR 损失**（主峰降低）+ **分辨率损失**（主瓣展宽）+ **副瓣抬高**。

这正是 Chap 5 引入**模糊函数**的动机——需要从**时延-多普勒二维视角**全面评估波形。

### 主线三：理解"加窗"的作用

`matched_filter.m` 中 4 种窗函数选项，是 Chap 3 知识的**工程应用**：
- 实际雷达几乎都使用某种窗函数；
- 在 SNR 与副瓣之间做权衡；
- 后续 Chap 7（脉冲压缩）会再次强调这一权衡。

### 主线四：GUI 工具

`matched_filter_gui.m` 是学习者的"试验台"——通过修改参数观察压缩脉冲的变化，是建立直觉的最佳方式。

### 主线五：辅助工具

- `addnoise.m` → 跟踪算法的输入模拟器；
- `Gaussian.m` → 模糊函数章节的预备知识。

### 全章逻辑流

```
Chap 3 (LFM/窗)  →  本章  →  Chap 5 (模糊函数)
                   ↓
                脉冲压缩 (Chap 7)
```

匹配滤波器是**时域-频域对称性**的完美体现，也是脉冲压缩技术的直接前置。

---

## 5. 关键公式汇总

### 5.1 匹配滤波器冲激响应（Eq. 4.20）

$$
h(t) = k \cdot s^*(t_0 - t)
$$

对 LFM $s(t) = \exp(j\pi \beta t^2)$：

$$
h(t) = k \cdot \exp(-j\pi \beta t^2) \quad (\text{下啁啾})
$$

### 5.2 匹配滤波输出 SNR

$$
\text{SNR}_{out} = \frac{2E}{N_0}
$$

其中 $E$ 是信号能量，$N_0$ 是噪声 PSD。这是**理论上界**，任何其他线性滤波器都不可能超过。

### 5.3 时域互相关实现

$$
y(t) = \int s^*(\tau) x(t + \tau) d\tau = s^*(-t) * x(t)
$$

### 5.4 频域快速实现

$$
Y(f) = S^*(f) \cdot X(f) \quad \Rightarrow \quad y(t) = \text{IFFT}[Y(f)]
$$

### 5.5 距离分辨率

$$
\Delta R = \frac{c}{2B}
$$

其中 $B$ 是信号带宽（对 LFM 即调频范围）。

### 5.6 失配损失

$$
L_{mismatch} = \frac{\text{SNR}_{out,mismatch}}{\text{SNR}_{out,perfect}}
$$

通常用 dB 表示，与目标多普勒频移、副本频率误差的关系为：

$$
L \approx 1 - \frac{|\Delta f|}{B}, \quad |\Delta f| \ll B
$$

### 5.7 模糊函数定义（Chap 5 预备）

$$
\chi(\tau, f_d) = \int_{-\infty}^{\infty} s(t) s^*(t - \tau) e^{j 2\pi f_d t} dt
$$

高斯脉冲的特殊情形：

$$
|\chi(\tau, f_d)| = \exp\left(-\frac{\tau^2}{4\sigma}\right) \exp\left(-\pi^2 f_d^2 \sigma^2\right)
$$

---

## 6. 章节总结

### 核心学习要点

1. **匹配滤波器的本质**：互相关 = "拿自己的副本去比对收到的信号"；
2. **频域实现的优势**：$O(N \log N)$ vs. $O(N^2)$，是工程实际的标准做法；
3. **距离分辨率只取决于带宽**：$\Delta R = c/(2B)$，与脉宽无关——这是脉冲压缩的核心思想；
4. **失配的代价**：SNR 下降 + 分辨率变差 + 副瓣抬高，提示我们波形设计要考虑多普勒容限；
5. **窗函数权衡**：副瓣降低 ⇔ 主瓣展宽，需要根据场景选择。

### 实践建议

- **运行 `matched_filter.m`**，改变散射体数量、距离、RCS，观察压缩脉冲的变化；
- 在 `matched_filter.m` 中切换窗函数（`winid=0,1,2,3`），比较副瓣抑制效果；
- 运行 `mismatch.m`，体会频率失配对压缩脉冲的影响；
- 用 `matched_filter_gui` 探索**两个靠得很近的目标**能否被分辨（如距离差 5 m vs. 20 m）；
- **思考**：当目标速度很快（多普勒频移大）时，`mismatch` 中展示的失配会非常严重，需要如何解决？（答案：Chap 5 介绍的距离-多普勒耦合处理、Chap 7 的 SFW/LFM 波形选择）

### 与后续章节的联系

- **Chap 5**（模糊函数）：把"失配"形式化为**时延-多普勒二维响应**；
- **Chap 6**（离散编码）：把匹配滤波扩展到**相位编码**信号（Barker 码、PRN 码等）；
- **Chap 7**（脉冲压缩）：把匹配滤波工程化为 **Stretch 处理**（dechirp）等具体硬件实现。

匹配滤波器是雷达信号处理"皇冠上的明珠"，后续所有波形设计都围绕它展开。
