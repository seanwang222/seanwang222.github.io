---
title: "基本脉冲与连续波雷达操作 · 代码实践"
titleEn: ""
summary: "本章是雷达系统分析的核心章节，推导了雷达距离方程（Radar Range Equation, RRE）的多种变体，并通过 13 个 MATLAB 代码文件将其工程化、可视化。学习目标包括："
part: "Part I"
chapter: 2
chapterTitle: "基本脉冲与连续波雷达操作"
chapterTitleEn: "Basic Pulsed and CW Radar Operations"
section: "0"
kind: "code"
order: 2999
tags: ["雷达系统", "第2章", "代码实践"]
source: "《雷达系统分析与设计（MATLAB版）》第 3 版 · 第 2 章代码"
---

## 1. 章节概述

本章是雷达系统分析的核心章节，推导了**雷达距离方程（Radar Range Equation, RRE）**的多种变体，并通过 13 个 MATLAB 代码文件将其工程化、可视化。学习目标包括：

- 掌握基本雷达方程的物理意义与数学形式（SNR、RCS、距离、功率的相互关系）
- 理解低 PRF / 高 PRF / 监视雷达方程各自的应用场景与公式差异
- 学会在干扰（SSJ / SOJ / Burn-through）环境下评估雷达性能
- 掌握雷达方程中各修正因子（损耗、噪声系数、占空比等）的处理方法
- 了解 CW 雷达、线性调频等扩展形式

代码侧重点：除极少数工具函数外，Chap 2 的代码大多是**复现教材图表**（命名以 `Fig*` 开头），它们以子函数 `radar_eq / lprf_req / hprf_req / power_aperture / ssj_req / soj_req / sir / burn_thru` 为支撑，构成"图—公式—代码"三位一体的学习闭环。

## 2. 代码清单表格

| 文件名 | 类型 | 功能简述 | 对应公式/小节 |
|--------|------|---------|---------------|
| `Fig2_1.m` | 脚本 | SNR vs. 距离曲线 (基本方程，不同 RCS/Pt) | Eq. 2.22, §2.1 |
| `Fig2_2.m` | 脚本 | 低 PRF 雷达方程 SNR vs. 距离/脉冲数 | Eq. 2.27, §2.2 |
| `Fig2_3.m` | 脚本 | 高 PRF 雷达方程 SNR vs. 距离 (不同占空比) | Eq. 2.31, §2.3 |
| `Fig2_6.m` | 脚本 | 功率孔径积 PAP vs. 距离 + Pav vs. 孔径 | Eq. 2.38, §2.4 |
| `Fig2_7b.m` | 脚本 | SSJ 烧穿距离 vs. 干扰机/雷达功率 | Eq. 2.50, §2.5 |
| `Fig2_8.m` | 脚本 | S/(J+N) vs. 距离 | Eq. 2.53, §2.5 |
| `Fig2_9.m` | 脚本 | 烧穿距离 vs. 干扰机 ERP | Eq. 2.54, §2.5 |
| `Fig2_10.m` | 脚本 | SOJ 条件下目标回波与干扰相对幅度 | Eq. 2.57/2.58, §2.5 |
| `Fig2_21.m` | 脚本 | 第一类 Bessel 函数 J0~J3 曲线 | §2.10 (辅助) |
| `myradar_visit8.m` | 脚本 | Myradar 设计案例：脉冲压缩雷达 SNR 计算 | §2.1-2.3 (案例) |
| `radar_eq_PC.m` | 函数 | 脉冲压缩雷达距离方程 | Eq. 2.39, §2.4 |
| `range_calc.m` | 函数 | 通用距离计算 (SNR ↔ R 互换) | Eq. 3.63, §2.1-2.5 |
| `range_calc_driver.m` | 脚本 | 启动距离计算 GUI | 工具脚本 |

> 工具依赖：以上脚本大部分都依赖于 `tool` 目录下的函数 `radar_eq / lprf_req / hprf_req / power_aperture / ssj_req / sir / burn_thru / soj_req`。本仓库未提供这些基础函数的源码，但它们的函数名清晰映射了教材中的方程。

## 3. 代码详解

### 3.1 `Fig2_1.m` — 基本雷达方程可视化

**功能**：绘制 SNR 随距离 R 变化的曲线，分别考察**目标 RCS** 与**雷达峰值功率**的影响。

**核心参数**：
- 峰值功率 $P_t = 1.5$ MW（基线）
- 频率 $f = 5.6$ GHz（C 波段）
- 天线增益 $G = 45$ dB
- RCS $\sigma = 0.1$ m²（基线）
- 带宽 $B = 5$ MHz，噪声系数 $F_n = 3$ dB，损耗 $L = 6$ dB
- 距离 $R \in [25, 165]$ km

**实现思路**：
1. 第一幅子图固定 $P_t$，让 $\sigma$ 变化一个数量级（±10 dBsm）；
2. 第二幅子图固定 $\sigma$，让 $P_t$ 在 $0.6 \sim 2.7$ MW 间变化；
3. 调用通用函数 `radar_eq` 计算 SNR：

```matlab
snr1 = radar_eq(pt, freq, g, sigma, b, nf, loss, range);
snr2 = radar_eq(pt, freq, g, sigma/10, b, nf, loss, range);
snr3 = radar_eq(pt, freq, g, sigma*10, b, nf, loss, range);
```

**结果解读**：
- 距离加倍，SNR 降低 $40 \log_{10}(2) \approx 12$ dB；
- $\sigma$ 加倍，SNR 升高 $10 \log_{10}(2) \approx 3$ dB；
- $P_t$ 加倍，SNR 同样升高 3 dB。

---

### 3.2 `Fig2_2.m` — 低 PRF 雷达方程

**核心公式**（Eq. 2.27）：

$$
\text{SNR} = \frac{n_p \, P_t \, G^2 \, \lambda^2 \, \sigma}{(4\pi)^3 \, k T_0 \, B \, F \, L \, R^4}
$$

其中 $n_p$ 是**积累脉冲数**，代表相干积累带来的处理增益。

**两幅子图**：
1. **SNR vs. 距离**（不同 $n_p$）：$n_p$ 从 1 增加到 10，SNR 曲线整体上移 $10 \log_{10}(n_p)$ dB；
2. **SNR vs. 脉冲数**（不同 $\sigma$）：在固定 $R = 150$ km 下，SNR 随 $n_p$ 线性增长（dB 域），$\sigma$ 增 10 倍使曲线整体上移 10 dB。

**关键参数**：$P_t = 1.5$ MW，$f = 5.6$ GHz，$G = 45$ dB，$\sigma = 0.1$ m²，$B = 5$ MHz。

```matlab
snr1 = lprf_req(pt, g, freq, sigma, np,    b, nf, loss, range);  % np=1
snr2 = lprf_req(pt, g, freq, sigma, 5*np,  b, nf, loss, range);  % np=5
snr3 = lprf_req(pt, g, freq, sigma, 10*np, b, nf, loss, range);  % np=10
```

---

### 3.3 `Fig2_3.m` — 高 PRF 雷达方程

**核心公式**（Eq. 2.31）：

$$
\text{SNR} = \frac{P_{av} \, T_i \, G^2 \, \lambda^2 \, \sigma}{(4\pi)^3 \, k T_0 \, F \, L \, R^4}
$$

其中 $P_{av} = P_t \cdot d_t$（平均功率 = 峰值功率 × 占空比），$T_i$ 是**驻留时间（time-on-target）**。

**典型参数**（脉冲多普勒雷达）：
- $P_t = 10$ kW（峰值功率较低，但占空比大）
- $G = 20$ dB
- 占空比 $d_t \in \{5\%, 10\%, 20\%\}$
- 驻留时间 $T_i = 2$ s
- $R \in [10, 225]$ km

**物理含义**：高 PRF 模式下，$d_t$ 提升 4 倍，$P_{av}$ 也提升 4 倍，SNR 提升 $10 \log_{10}(4) \approx 6$ dB。这解释了脉冲多普勒雷达采用高占空比以提高弱目标检测能力的设计思路。

```matlab
snr1 = hprf_req(pt, Ti, g, freq, sigma, 0.05, range, nf, loss);  % dt=5%
snr2 = hprf_req(pt, Ti, g, freq, sigma, 0.10, range, nf, loss);  % dt=10%
snr3 = hprf_req(pt, Ti, g, freq, sigma, 0.20, range, nf, loss);  % dt=20%
```

---

### 3.4 `Fig2_6.m` — 功率孔径积 (Power-Aperture Product)

**核心公式**（Eq. 2.38）：

$$
P_{av} A_e = \frac{\text{SNR} \cdot (4\pi) k T_0 F L R^4 \Omega}{\sigma \cdot t_{sc}}
$$

其中 $\Omega$ 是搜索立体角（方位角 × 俯仰角），$t_{sc}$ 是扫描周期。

**两幅子图**：
1. **Fig 2.6a：PAP vs. 距离**——给定 SNR/RCS/扫描时间需求，所需 PAP 随 $R^4$ 增长；
2. **Fig 2.6b：$P_{av}$ vs. 孔径 $A_e$**——固定 PAP 下，$P_{av}$ 与 $A_e$ 是此消彼长的关系（曲线斜率为 -1）。

**关键洞察**：雷达设计师必须在"加大发射功率"和"加大天线"之间做权衡；二者对探测能力的贡献是**等价**的。

```matlab
pap1 = power_aperture(snr, tsc, sigma/10, range, nf, loss, az_angle, el_angle);
Pav1 = pap1 - Ae;   % 固定 PAP = Pav + Ae
```

---

### 3.5 `Fig2_7b.m` — 自屏蔽干扰机 (SSJ) 烧穿距离

**核心公式**（Eq. 2.50）：

$$
R_{BT} = \frac{1}{1000} \sqrt{\frac{P_t \, G \, \sigma \, B_j \, L_j}{4\pi \, P_j \, G_j \, B \, L}}
$$

**两幅子图**：
1. **上半部分**：烧穿距离 vs. 干扰机功率 $P_j$（$1\sim 1000$ W）。$P_j$ 加倍 → $R_{BT}$ 减小 $\sqrt{2}$，即减小 $3$ dB；
2. **下半部分**：烧穿距离 vs. 雷达峰值功率 $P_t$（$1$ kW $\sim 10$ MW）。$P_t$ 加倍 → $R_{BT}$ 增大 $\sqrt{2}$。

**核心矛盾**：干扰机功率每增 10 倍，烧穿距离降至 1/√10 ≈ 0.316 倍。

```matlab
BR_pj = sqrt((pt * 10^(g/10) * sigma * bj * 10^(lossj/10)) ...
   ./ (4.0*pi .* pj_var * 10^(gj/10) * b * 10^(loss/10))) ./ 1000;
```

---

### 3.6 `Fig2_8.m` — S/(J+N) 随距离变化

**核心思想**：在远距上目标回波 $S \propto 1/R^4$，但干扰 $J \propto 1/R^2$（因为干扰机装载在目标上，路径损耗 $R^2$ 而非 $R^4$）。因此：
- **近距**：干扰 $J$ 占主导，S/(J+N) 随距离增大而上升；
- **远距**：回波 $S$ 占主导，S/(J+N) 上升变缓。

```matlab
R = linspace(10, 400, 5000);
[SIR] = sir(50e3, 35, 10, 5.6e9, 50e-6, 5, R, 200, 50e6, 10, 0.3);
```

参数：$P_t = 50$ kW，$G = 35$ dB，$\sigma = 10$ m²，$f = 5.6$ GHz，$\tau = 50$ μs，$P_j = 200$ W，$B_j = 50$ MHz，$G_j = 10$ dB。

---

### 3.7 `Fig2_9.m` — 烧穿距离 vs. 干扰机 ERP

**核心公式**（Eq. 2.54）：

$$
R_{BT}^2 = \sqrt{v_1^2 + v_2} - v_1
$$

其中 $v_1, v_2$ 由雷达参数、干扰机 ERP、所需 SIR$_{min}$ 共同决定。

**实现**：横轴为干扰机 ERP (dBW)，从 1 W 扫描到 1000 W。曲线呈"单调上升"趋势——干扰越强，需要在更近距离上才能烧穿干扰。

```matlab
ERP = linspace(1, 1000, 1000);
[Range] = burn_thru(50e3, 35, 10, 5.6e9, 0.5e-3, 5, 200, 500e6, 10, 0.3, 15, ERP);
plot(10*log10(ERP), Range, 'k')
```

---

### 3.8 `Fig2_10.m` — 远距离干扰机 (SOJ)

**与 SSJ 的关键区别**：
- SSJ：干扰机装载在目标上 → $J \propto 1/R^2$，烧穿距离 $R_{BT} \propto \sqrt{1/P_j}$；
- SOJ：干扰机部署在远处（$R_j$ 固定）→ $J$ 不随目标距离变化，烧穿距离 $R_{BT} \propto (1/P_j)^{1/4}$。

**核心公式**（Eq. 2.58）：

$$
R_{BT} = \left[ \frac{P_t \, G^2 \, \sigma \, B_j \, L_j \, R_j^2}{4\pi \, P_j \, G_j \, G' \, B \, L} \right]^{1/4} / 1000
$$

**绘图**：横轴为"归一化到交叉距离的目标距离"（$0.1 \sim 1000$），纵轴为相对信号/干扰幅度。目标回波曲线以 $-40 \log_{10}(R/R_{BT})$ 下降，而 SOJ 干扰曲线在交叉距离处归零（保持水平）。

```matlab
s_at_br = pt_db + 2.0*g + lambda_db + sigmadb ...
   - 3.0*factor - 4.0*10*log10(BR_range) - loss;
% 目标回波
s(index) = pt_db + 2.0*g + lambda_db + sigmadb ...
   - 3.0*factor - 4.0*ran_db - loss + s_at_br;
% SOJ 干扰
soj(index) = 0;  % 归一化为零
```

---

### 3.9 `Fig2_21.m` — Bessel 函数辅助图

虽然名为 `Fig2_21`，但内容是 Bessel 函数 $J_0(z), J_1(z), J_2(z), J_3(z)$ 的曲线。这些函数在**圆形孔径天线、圆柱目标散射、CFAR 检测**等场景常用。

```matlab
z = 0:0.01:15;
j0 = besselj(0, z);
j1 = besselj(1, z);
j2 = besselj(2, z);
j3 = besselj(3, z);
plot(z, j0, 'k', z, j1, 'k', z, j2, 'k', z, j3, 'k')
```

**关键性质**：
- $J_0$ 在 $z=0$ 处为 1，其余阶在 $z=0$ 处为 0；
- 随 $z$ 增大，振幅 $\propto 1/\sqrt{z}$（衰减振荡）；
- $J_n$ 的零点决定圆形孔径天线的副瓣位置。

---

### 3.10 `myradar_visit8.m` + `radar_eq_PC.m` — Myradar 案例

这是一个**综合设计案例**：设计一部能同时检测导弹（RCS=0.5 m²，55 km）和飞机（RCS=4 m²，90 km）的 X 波段雷达。

**案例参数**：
- $P_{fa} = 10^{-7}$，$P_d = 0.995$
- 积累脉冲数 $n_p = 5$
- 脉宽 $\tau = 20$ μs
- $P_t = 2$ kW，$f = 9$ GHz
- $G = 44$ dB
- $T_e = 290$ K，$F_n = 6$ dB，$L = 8$ dB

**核心函数 `radar_eq_PC` 的实现**（Eq. 2.39）：

```matlab
function snr = radar_eq_PC(np, pt, freq, g, sigma, te, tau, nf, loss, range)
c = 3.0e+8;
k = 1.38e-23;
lambda = c / freq;
b = 1.0 / tau;        % 带宽 ≈ 1/脉宽
% 全部转 dB
p_peak_db = 10*log10(pt);
lambda_sqdb = 10*log10(lambda^2);
sigmadb = 10*log10(sigma);
four_pi_cub = 10*log10((4.0*pi)^3);
k_db = 10*log10(k);
te_db = 10*log10(te);
b_db = 10*log10(b);
tau_db = 10*log10(tau);
np_db = 10*log10(np);
range_pwr4_db = 10*log10(range.^4);
% SNR = Pt*tau*G^2*lambda^2*sigma*np / (R^4*(4pi)^3*k*Te*B*F*L)
num = p_peak_db + tau_db + 2*g + lambda_sqdb + sigmadb + np_db;
den = four_pi_cub + k_db + te_db + b_db + nf + loss + range_pwr4_db;
snr = num - den;
end
```

**关键细节**：
- 脉冲压缩雷达虽然引入了 $\tau$ 因子，但**匹配滤波后的 SNR 不会因脉冲压缩而改变**——压缩过程只是把宽脉冲压缩为窄脉冲，提高距离分辨率；
- $B \approx 1/\tau$ 是工程近似（精确值应等于 chirp 带宽）；
- `np_db` 项代表**积累增益**：5 个脉冲相干积累可使 SNR 提升 $10 \log_{10}(5) \approx 7$ dB。

**调用**：
```matlab
SNR_single_pulse_missile  = radar_eq_PC(5, 2e3, 9e9, 44, 0.5, 290, 20e-6, 6, 8, 55e3)
SNR_single_pulse_aircraft = radar_eq_PC(5, 2e3, 9e9, 44, 4,   290, 20e-6, 6, 8, 90e3)
```

---

### 3.11 `range_calc.m` + `range_calc_driver.m` — 通用距离计算

`range_calc.m` 是一个**多功能设计工具**，能根据雷达类型和输出选项做两件事：
1. 给定距离向量 → 输出 SNR 曲线；
2. 给定目标 SNR → 反解最大探测距离。

**核心实现**：
- `radar_type = 0` → CW 雷达，平均功率 = `pcw`；
- `radar_type = 1` → 脉冲雷达，平均功率 = `pt * tau * fr`（即 $P_t \cdot d_t$）；
- `out_option = 0` → SNR vs. 距离；`= 1` → 最大距离 vs. SNR。

**反解距离**的数学：

$$
R = 10^{R^4_{dB}/40} / 1000 \quad [\text{Km}]
$$

**GUI 入口**：
```matlab
% range_calc_driver.m
open rangecalculation.fig
```

GUI 提供交互式输入雷达参数并实时显示结果，是学习雷达方程的极好工具。

---

## 4. 代码串联叙述

本章代码可以归纳为**五条主线**：

### 主线一：基本方程 → 不同工作模式

`Fig2_1.m` 从最基本的形式 $\text{SNR} = f(P_t, G, \lambda, \sigma, R, ...)$ 出发，演示了 **RCS 和峰值功率**对 SNR 的影响（±3 dB/倍频）。在此基础上，代码分化为两个变体：

- **低 PRF 模式**（`Fig2_2.m`）：通过引入积累脉冲数 $n_p$ 让 SNR 获得处理增益；
- **高 PRF 模式**（`Fig2_3.m`）：通过引入平均功率 $P_{av} = P_t \cdot d_t$ 和驻留时间 $T_i$，让 SNR 由占空比提升而提升。

二者背后的设计哲学：**低 PRF 适合测距无模糊但需积累；高 PRF 适合测速无模糊但占空比大**。

### 主线二：扫描雷达 → 功率孔径积

`Fig2_6.m` 将"搜索"行为形式化为**功率孔径积** $P_{av} A_e$——一个不依赖具体雷达结构、只反映"探测能力"大小的综合指标。它把搜索范围 $\Omega$、扫描时间 $t_{sc}$ 都纳入方程，揭示出：**搜索能力 ∝ $P_{av} A_e / (R^4 \Omega / t_{sc})$**。

### 主线三：干扰环境 → 三种烧穿曲线

干扰主题由三个图分头展示：

| 文件 | 干扰类型 | 干扰距离 | 烧穿关系 |
|------|---------|---------|---------|
| `Fig2_7b.m` | SSJ | 装载在目标上 | $R_{BT} \propto \sqrt{1/P_j}$ |
| `Fig2_8.m` | SSJ | 装载在目标上 | SIR vs. R 曲线 |
| `Fig2_9.m` | SSJ | 装载在目标上 | $R_{BT}$ vs. ERP |
| `Fig2_10.m` | SOJ | 部署在远处 | $R_{BT} \propto (1/P_j)^{1/4}$ |

SSJ 与 SOJ 的本质区别：**SSJ 中 $J$ 也随 $R$ 衰减，曲线更陡**；**SOJ 中 $J$ 几乎不随 $R$ 变化，曲线更平**。

### 主线四：综合设计案例

`myradar_visit8.m` + `radar_eq_PC.m` 把前几条主线"打包"为真实的设计问题。它演示了一个完整工作流：
1. **需求分析**：虚警率、检测概率、积累脉冲数；
2. **参数选择**：发射功率、频率、天线、波形（脉宽）；
3. **SNR 计算**：调用 `radar_eq_PC` 验证是否同时满足导弹和飞机两类目标的检测需求。

### 主线五：工程工具

`range_calc.m` + `range_calc_driver.m` 是工程师视角的"瑞士军刀"——它把 SNR ↔ R 的双向计算、CW/脉冲的功率换算都封装在一个函数里。配合 GUI，使设计者能快速做"what-if"分析。

### 主线六：数学工具

`Fig2_21.m` 提供 Bessel 函数可视化，是后续章节（圆形孔径天线、目标散射）的数学准备。

---

## 5. 关键公式汇总

### 5.1 基本雷达距离方程（Eq. 2.22）

$$
\text{SNR} = \frac{P_t G^2 \lambda^2 \sigma}{(4\pi)^3 k T_0 B F L R^4}
$$

- dB 形式：$\text{SNR[dB]} = P_t + 2G + \lambda^2 + \sigma - (4\pi)^3 - k T_0 B F L - 40\log_{10} R$

### 5.2 低 PRF 方程（Eq. 2.27）

$$
\text{SNR} = \frac{n_p P_t G^2 \lambda^2 \sigma}{(4\pi)^3 k T_0 B F L R^4}
$$

### 5.3 高 PRF 方程（Eq. 2.31）

$$
\text{SNR} = \frac{P_{av} T_i G^2 \lambda^2 \sigma}{(4\pi)^3 k T_0 F L R^4}, \quad P_{av} = P_t d_t
$$

### 5.4 脉冲压缩雷达方程（Eq. 2.39）

$$
\text{SNR}_{PC} = \frac{n_p P_t \tau G^2 \lambda^2 \sigma}{(4\pi)^3 k T_e B F L R^4}
$$

### 5.5 功率孔径积（Eq. 2.38）

$$
P_{av} A_e = \frac{\text{SNR} \cdot 4\pi k T_0 F L R^4 \Omega}{\sigma t_{sc}}
$$

### 5.6 SSJ 烧穿距离（Eq. 2.50）

$$
R_{BT} = \sqrt{\frac{P_t G \sigma B_j L_j}{4\pi P_j G_j B L}}
$$

### 5.7 SOJ 烧穿距离（Eq. 2.57/2.58）

$$
R_{BT} = \left[ \frac{P_t G^2 \sigma B_j L_j R_j^2}{4\pi P_j G_j G' B L} \right]^{1/4}
$$

### 5.8 S/(J+N)（Eq. 2.53）

$$
\text{SIR} = \frac{S}{J + N} = \frac{\frac{P_t \tau G^2 \lambda^2 \sigma A_r}{(4\pi)^2 L R^4}}{\frac{\text{ERP}_j A_r}{4\pi B_j R_j^2} + k T_0}
$$

### 5.9 烧穿距离平方根形式（Eq. 2.54）

$$
R_{BT}^2 = \sqrt{v_1^2 + v_2} - v_1
$$

### 5.10 CW/通用距离方程（Eq. 3.63，由 `range_calc` 实现）

$$
\text{SNR} = \frac{P_{av} G_t G_r \lambda^2 \sigma t_i}{(4\pi)^3 k T_e F L R^4}
$$

---

## 6. 章节总结

### 核心学习要点

1. **雷达距离方程是设计的"宪法"**：所有变体都基于基本形式 $1/R^4$ 关系，差异在于 $P_t$ 如何被替换（$P_{av}, P_t \tau n_p$ 等）；
2. **不同工作模式权衡**：低 PRF（测距不模糊）vs. 高 PRF（测速不模糊）；搜索（功率孔径积）vs. 跟踪（峰值功率）；
3. **干扰环境分析**：理解 SSJ 和 SOJ 的根本区别——干扰信号的传播路径不同决定了 $J \propto 1/R^2$ 还是常数；
4. **烧穿距离**是评估雷达抗干扰能力的关键指标，与干扰功率的 $1/2$ 次方或 $1/4$ 次方成反比；
5. **工程视角**：通过 `range_calc` / `radar_eq_PC` / `myradar_visit8` 等工具，把公式转化为可计算、可交互的设计工具。

### 实践建议

- **跑一遍每个 `Fig*` 文件**，观察曲线是否符合预期——这是检验理论理解的最好方法；
- 修改 `Fig2_1.m` 中的参数（如 $P_t$、$\sigma$、$f$），体会 $40\log_{10}(2) = 12$ dB 规律的"实用性"；
- 把 `myradar_visit8` 中的 RCS/距离互换，看哪类目标对系统设计更"硬约束"；
- 尝试用 `range_calc` 反解"为检测 100 km 处 $\sigma=1$ m² 目标需要多大 PAP"。

### 与后续章节的联系

- **Chap 3** 在 Chap 2 的能量信号基础上引入**复信号表示**和**线性系统理论**——为匹配滤波器的推导做准备；
- **Chap 4** 将基本方程的 $P_t \tau$ 替换为更一般的**匹配滤波器输出 SNR = $2E/N_0$**——引出脉冲压缩的核心思想；
- **Chap 5-6** 进一步讨论**模糊函数**，从时延-多普勒二维视角评估波形；
- **Chap 7** 把脉冲压缩技术工程化，给出 SFW、LFM、Stretch 等具体实现。

本章是后续所有章节的**数学/物理基础**。
