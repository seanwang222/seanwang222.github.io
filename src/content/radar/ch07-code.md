---
title: "脉冲压缩 · 代码实践"
titleEn: ""
summary: "脉冲压缩 (Pulse Compression) 是 Chap 4 6 数学理论的工程实现 ——把\"匹配滤波器\"、\"模糊函数\"等概念落到具体的雷达信号处理流水线上。本章 7 个代码文件覆盖两大主流实现："
part: "Part II"
chapter: 7
chapterTitle: "脉冲压缩"
chapterTitleEn: "Pulse Compression"
section: "0"
kind: "code"
order: 7999
tags: ["雷达系统", "第7章", "代码实践"]
source: "《雷达系统分析与设计（MATLAB版）》第 3 版 · 第 7 章代码"
---

## 1. 章节概述

**脉冲压缩 (Pulse Compression)** 是 Chap 4-6 数学理论的**工程实现**——把"匹配滤波器"、"模糊函数"等概念落到具体的雷达信号处理流水线上。本章 7 个代码文件覆盖两大主流实现：

1. **直接匹配滤波**（沿用 Chap 4 的 `matched_filter.m`）：适用于**中等带宽** LFM；
2. **Stretch 处理 (Dechirp)**：适用于**大带宽** LFM；
3. **步进频率波形 (SFW)**：用 N 个**窄脉冲**合成大带宽。

学习目标：
1. 理解 Stretch 处理的数学原理和工程优势
2. 掌握 SFW 距离像的合成与运动补偿
3. 理解"匹配滤波 vs Stretch vs SFW"的适用场景
4. 学会用 FFT 大小优化（`power_integer_2.m`）

## 2. 代码清单表格

| 文件名 | 类型 | 功能简述 | 对应小节 |
|--------|------|---------|---------|
| `Fig7_3.m` | 脚本 | 2 个点目标的 LFM 匹配滤波 | §7.2 (直接匹配滤波) |
| `stretch.m` | 函数 | Stretch 处理器 (Dechirp) | §7.4 |
| `stretch_gui.m` | 函数 | Stretch GUI 入口 | 工具 |
| `SFW.m` | 函数 | 步进频率波形距离像生成 | §7.5 |
| `Fig7_19.m` | 脚本 | SFW HRR 距离像（动目标） | §7.5 |
| `Fig7_20.m` | 脚本 | SFW HRR 距离像（变体） | §7.5 |
| `power_integer_2.m` | 函数 | 计算 $\ge x$ 的最小 2 的幂 | 工具 |

## 3. 代码详解

### 3.1 `Fig7_3.m` — 直接匹配滤波复习

```matlab
clear all
close all
nscat = 2;
taup = 10e-6;
b = 50.0e6;
rrec = 50;
scat_range = [15 25];
scat_rcs = [1 2];
winid = 0;
[y] = matched_filter(nscat, taup, b, rrec, scat_range, scat_rcs, winid);
```

**功能**：直接调用 Chap 4 的 `matched_filter.m`，演示两个点散射体在 LFM 脉冲压缩下的响应。

**关键参数**：
- 脉宽 $\tau = 10$ μs
- 带宽 $B = 50$ MHz
- 距离分辨率 $\Delta R = c/(2B) = 3$ m
- 两个散射体距离 15 m、25 m（间隔 10 m，远大于 $\Delta R$）

**教学意义**：作为**基线**——让读者直接对比"直接匹配滤波"和"Stretch 处理"的输出差异。

---

### 3.2 `stretch.m` — Stretch (Dechirp) 处理器

**核心思想**：把大带宽 LFM 回波**与发射副本混频**，产生频率正比于目标距离的**单频信号**（差频 $f_{\text{IF}}$），再 FFT 得到距离信息。

**数学原理**：

发射信号：
$$
s(t) = \text{rect}\left(\frac{t}{\tau}\right) e^{j\pi \mu t^2}, \quad \mu = B/\tau
$$

目标回波（距离 $R$ 对应时延 $\tau_R = 2R/c$）：
$$
s_r(t) = \text{rect}\left(\frac{t - \tau_R}{\tau}\right) e^{j\pi \mu (t - \tau_R)^2}
$$

Stretch 混频（与发射副本共轭相乘）：
$$
s_{\text{IF}}(t) = s_r(t) \cdot s^*(t) = \text{rect}(\cdot) e^{j 2\pi \mu \tau_R t} \cdot e^{j\phi_0}
$$

**差频**：
$$
f_{\text{IF}} = \mu \cdot \tau_R = \frac{B}{\tau} \cdot \frac{2R}{c}
$$

**距离**：
$$
R = \frac{c \cdot f_{\text{IF}} \cdot \tau}{2B}
$$

**实现**：
```matlab
% 各散射体混频后信号
for j = 1:1:nscat
    range = scat_range(j);
    psi1 = 4.0 * pi * range * f0 / c - 4.0 * pi * b * range * range / c / c / taup;  % 常相位
    psi2 = (2 * 4.0 * pi * b * range / c / taup) .* t;                                % 距离-时间项
    x(j, :) = scat_rcs(j) .* exp(i*psi1 + i.*psi2);
    y = y + x(j, :);
end

% 加窗 + FFT
ywin = y .* win';
yfft = fft(y, n) ./ n;
out = fftshift(abs(yfft));
```

**关键优势**：

| 维度 | 直接匹配滤波 | Stretch |
|------|------------|---------|
| 所需 ADC 采样率 | $\ge B$（射频带宽） | $\ge$ 差频带宽 $\mu \cdot \Delta\tau$ |
| 距离分辨率 | $\Delta R = c/(2B)$ | $\Delta R = c/(2B)$ |
| 计算量 | 大（N 维相关） | 小（FFT） |

对于大带宽（如 1 GHz 以上），Stretch 是**唯一可行**的方案——ADC 速率跟不上射频带宽。

**FFT 大小优化**：
```matlab
n = fix(2.0 * trec * b);          % 实际数据点数
m = power_integer_2(n);            % 找到 >= n 的 2 的幂
nfft = 2.^m;                       % FFT 大小（补零）
```

补零使 FFT 大小为 2 的幂，加速 Cooley-Tukey 算法。

---

### 3.3 `stretch_gui.m` — Stretch GUI

**功能**：MATLAB GUIDE 生成的 GUI 入口，提供 8 个参数输入框（散射体数、脉宽、起始频率、带宽、接收窗、距离、RCS、窗类型）。

**调用流程**：
1. 启动 GUI（运行 `stretch_gui`）；
2. 填入参数；
3. 点击运行（togglebutton3）；
4. GUI 调用 `stretch.m`，显示未压缩回波 + 压缩后距离像。

---

### 3.4 `SFW.m` — 步进频率波形距离像

**核心思想**：发射 N 个脉冲，第 $i$ 个脉冲的频率 $f_i = f_0 + (i-1) \Delta f$。对 N 个回波的相位做 IFFT，得到距离剖面。

**实现**：
```matlab
% 构造各脉冲 I/Q 回波（含目标速度引起的相位偏移）
for i = 1:num_pulses
    rec_freq = (i-1) * freq_step;
    phase_arg = -2*pi*rec_freq * ...
       (2.0*scat_range(jscat)/c - 2.0*(V/c)*((i-1)*PRI + taur/2 + 2*scat_range(jscat)/c));
    Inphase_tgt(ii) = Inphase_tgt(ii) + sqrt(scat_rcs(jscat)) * cos(phase_arg);
    Quadrature_tgt(ii) = Quadrature_tgt(ii) + sqrt(scat_rcs(jscat)) * sin(phase_arg);
end

% 加窗 + IFFT
Weighted_IQ_freq_domain = Weighted_I_freq_domain + Weighted_Q_freq_domain*1j;
Weighted_IQ_freq_domain(num_pulses:2*num_pulses) = 0.0 + 0.0i;   % 补零
Weighted_IQ_time_domain = ifft(Weighted_IQ_freq_domain);
dB_abs_Weighted_IQ_time_domain = 20.0*log10(abs(Weighted_IQ_time_domain)) + SNR_dB;
```

**关键参数**：
- 距离分辨率：$\Delta R = c / (2 N \Delta f)$
- 不模糊距离窗：$R_u = c / (2 \Delta f)$

**目标速度补偿**：
```matlab
phase_arg = -2*pi*rec_freq * ...
   (2.0*scat_range/c - 2.0*(V/c)*((i-1)*PRI + taur/2 + 2*scat_range/c));
```

第 $i$ 个脉冲的相位中包含**目标速度引起的额外相位偏移** $-2\pi f_{d,i} \cdot t_i$，其中 $f_{d,i} = 2V f_i / c$（多普勒频移）。

**注意**：对于**慢速目标**（$V \ll c/(2N\Delta f T)$），此项可忽略；对于**快速目标**，需精确补偿。

**距离剖面 (dB)**：
```matlab
% 不模糊距离窗
Ru = c / 2.0 / deltaf;
hl = dB_abs_Weighted_IQ_time_domain;
```

---

### 3.5 `Fig7_19.m` + `Fig7_20.m` — SFW 距离像（动目标）

**两个文件几乎相同**，都是演示**动目标**的 SFW 距离像演化。

**关键参数**：
```matlab
nscat = 1;
scat_range = 912;    % 目标初始距离 [m]
scat_rcs = 10;       % 目标 RCS [m^2]
n = 64;              % 频率步进数
deltaf = 10e6;       % 频率步进 [Hz] = 10 MHz
prf = 10e3;          % 脉冲重复频率 [Hz] = 10 kHz
v = 10;              % 目标速度 [m/s]（接近）
rnote = 900;         % 参考距离 [m]
winid = 1;           % Hamming 加窗
```

**关键计算**：
- 距离分辨率：$\Delta R = c / (2 \cdot 64 \cdot 10^7) = 0.234$ m
- 不模糊距离窗：$R_u = c / (2 \cdot 10^7) = 15$ m
- 距离-时间演化：每个时间步，目标距离减少 $2 n v / \text{prf} = 2 \cdot 64 \cdot 10 / 10^4 = 0.128$ m

**可视化**：
```matlab
figure(1)
numb = 2*256;
delx_meter = 15 / numb;
xmeter = 0:delx_meter:15-delx_meter;
imagesc(xmeter, 0:0.05:4, array)
ylabel('Time in seconds')
xlabel('Relative distance in meters')
```

`imagesc` 显示"距离-时间"二维图：
- 横轴：相对距离（0~15 m）
- 纵轴：时间（0~3 s，步长 0.05 s）
- 颜色：dB 强度

**观察要点**：
- 目标因运动产生**距离走动**（range walk）—— 距离像随时间偏移；
- Hamming 加窗抑制距离旁瓣（−43 dB）；
- 速度补偿精度对距离像**聚焦**至关重要。

**两个文件的细微差别**：`Fig7_19.m` 和 `Fig7_20.m` 的代码几乎完全一致，可能是教材中两个相邻示例的重复。

---

### 3.6 `power_integer_2.m` — 2 的幂工具

```matlab
function m = power_integer_2(x)
m = 0;
while (2^m < x)
   m = m + 1;
end
```

**功能**：返回满足 $2^m \ge x$ 的最小非负整数 $m$。

**应用**：
```matlab
n = fix(2.0 * trec * b);    % 数据点数
m = power_integer_2(n);      % FFT 大小指数
nfft = 2.^m;                 % FFT 大小
```

**意义**：FFT 算法（Cooley-Tukey）要求长度为 2 的整数次幂，否则需用混合基数算法（效率低）。这个工具函数确保 FFT 大小最优。

---

## 4. 代码串联叙述

本章代码呈现"**三种脉冲压缩工程实现**"的清晰对比。

### 主题一：直接匹配滤波（基线）

`Fig7_3.m` 调用 Chap 4 的 `matched_filter.m`，给出**最简单**的实现路径：
- 接收信号 $\rightarrow$ 相关器 $\rightarrow$ 压缩输出；
- 所需 ADC 采样率 $\ge B$。

**优点**：实现简单；
**缺点**：大带宽场景下 ADC 速率跟不上。

### 主题二：Stretch 处理（大带宽 LFM）

`stretch.m` 解决了"大带宽"问题：
- 混频 $\rightarrow$ 差频 $\rightarrow$ FFT $\rightarrow$ 距离；
- 所需 ADC 采样率只需覆盖**差频带宽**（远小于射频全带宽）。

**核心公式**（重复强调）：
$$
f_{\text{IF}} = \mu \tau_R = \frac{B}{\tau} \cdot \frac{2R}{c}
$$

**应用场景**：合成孔径雷达 (SAR)、高分辨率 LFM 雷达、毫米波雷达。

**对比图**：

| 维度 | 直接匹配滤波 | Stretch |
|------|------------|---------|
| 适用带宽 | < 100 MHz | 1 GHz+ |
| ADC 速率 | $\ge B$ | $\ge \mu \cdot \Delta\tau_R$ |
| 计算量 | 相关 N 点 | FFT N 点 |
| 距离-多普勒耦合 | 存在 | 保留 |

### 主题三：步进频率波形 (SFW)

`SFW.m` 提供了**第三条路**——用 N 个窄带脉冲合成大带宽。

**核心参数**：
- 距离分辨率：$\Delta R = c / (2 N \Delta f)$
- 不模糊距离窗：$R_u = c / (2 \Delta f)$

**优势**：
- **硬件简化**：每脉冲带宽仅 $\Delta f$（窄带），发射机和接收机都更简单；
- **软件合成**：用数字信号处理获得大带宽效果。

**挑战**：
- **目标速度补偿**：第 $i$ 个脉冲的相位需考虑 $2V (i-1) \text{PRI}$ 的走动；
- **相干性**：N 个脉冲需严格相干（同一 COHO 源）。

**应用**：F-16、F-35 等现代战机雷达；SAR 精成像。

### 主题四：动目标演示

`Fig7_19.m` + `Fig7_20.m` 演示**运动目标**的 SFW 距离像演化。

**观察重点**：
- **距离走动 (Range Walk)**：每个时间步距离像的峰值移动；
- **多普勒频移**：FFT 后主峰展宽或偏移；
- **加窗效果**：Hamming 把旁瓣压到 −43 dB，代价是主瓣轻微展宽。

### 主题五：工程辅助

`power_integer_2.m` 是一个小但极有用的工具——确保 FFT 大小为 2 的幂，是工程中性能优化的常见技巧。

### 三种方法的"选择决策树"

```
需要脉冲压缩？
├─ 带宽 < 100 MHz → 直接匹配滤波 (Fig7_3.m)
├─ 带宽 > 100 MHz 但连续 LFM → Stretch (stretch.m)
└─ 带宽 > 100 MHz 且脉冲体制 → SFW (SFW.m)
```

---

## 5. 关键公式汇总

### 5.1 LFM 脉冲压缩基本关系

- 距离分辨率：$\Delta R = c / (2B)$
- 时宽带宽积：$BT = B\tau$
- 压缩比：$R_c = \tau / \tau_c = BT$，其中 $\tau_c = 1/B$ 是压缩后脉宽

### 5.2 匹配滤波器输出（Chap 4 Eq. 4.20）

$$
h(t) = k \cdot s^*(t_0 - t), \quad y(t) = s_r(t) * h(t)
$$

### 5.3 Stretch 处理（差频）

$$
f_{\text{IF}} = \mu \cdot \tau_R = \frac{B}{\tau} \cdot \frac{2R}{c}
$$

距离反算：
$$
R = \frac{c \cdot f_{\text{IF}} \cdot \tau}{2 B}
$$

### 5.4 SFW 距离像

- 第 $i$ 个脉冲频率：$f_i = f_0 + (i-1) \Delta f$
- 距离分辨率：$\Delta R = c / (2 N \Delta f)$
- 不模糊距离窗：$R_u = c / (2 \Delta f)$
- 距离走动脉冲数：$R_{\text{walk}} = 2 v N / \text{PRF}$（每帧走动）

### 5.5 SFW 目标速度补偿

第 $i$ 个脉冲的相位需包含多普勒偏移：

$$
\phi_i = -2\pi (i-1) \Delta f \left[\frac{2R}{c} - \frac{2V}{c}\left((i-1) T_r + \frac{\tau_R}{2} + \frac{2R}{c}\right)\right]
$$

### 5.6 Stretch 处理差频带宽

$$
B_{\text{IF}} = \mu \cdot \Delta\tau_R = \frac{B}{\tau} \cdot \frac{2 \Delta R}{c}
$$

**关键**：$B_{\text{IF}} \ll B$，这是 Stretch 的核心优势。

### 5.7 距离-多普勒耦合（Stretch 后）

Stretch 处理保留了 LFM 的距离-多普勒耦合特性：

$$
\Delta R_{\text{coupling}} = \frac{c \cdot f_d}{2 \mu}
$$

---

## 6. 章节总结

### 核心学习要点

1. **三种脉冲压缩实现**：
   - **直接匹配滤波**：简单但 ADC 速率要求高；
   - **Stretch (Dechirp)**：大带宽 LFM 的标准方案；
   - **SFW**：用窄脉冲合成宽带，硬件简化。
2. **Stretch 的核心洞察**：差频 $f_{\text{IF}}$ 正比于目标距离，FFT 后直接得到距离像；
3. **SFW 的硬件优势**：每脉冲窄带，硬件简单，距离分辨率由 N 步进决定；
4. **运动补偿的必要性**：目标速度引入相位偏移和距离走动，必须补偿才能聚焦；
5. **FFT 大小优化**：补零到 2 的幂是工程中性能优化的常见技巧。

### 实践建议

- **运行 `Fig7_3.m` → `stretch.m` → `SFW.m`**，观察三种方法的输出差异；
- 修改 `stretch.m` 中的目标距离（如把 50 改为 200），观察差频如何变化；
- 在 `SFW.m` 中**关闭速度补偿**（把 $V = 0$），看距离像如何散焦；
- **思考**：
  - 为什么 Stretch 处理后还需要 FFT 而不是直接用差频？
  - SFW 中为什么需要补零到 2 倍脉冲数？
  - 三种方法对**多目标**的处理能力有何差异？

### 与后续章节的联系

- **Chap 8**（雷达波传播）：实际雷达回波会受多径、衰减、色散影响，需评估脉冲压缩对这些效应的稳健性；
- **Chap 10**（MTI/PD）：脉冲压缩 + 脉冲多普勒处理是现代雷达的"双剑合璧"；
- **Chap 18**（SAR）：Stretch 处理是 SAR 成像的核心算法。

Chap 7 是 Part II（信号处理）的"工程终点"——前 6 章的数学理论在本章落地为具体的实现代码。
