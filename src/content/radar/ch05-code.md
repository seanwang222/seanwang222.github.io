---
title: "模糊函数——模拟波形 · 代码实践"
titleEn: ""
summary: "模糊函数 (Ambiguity Function, AF) 是雷达波形分析的核心工具，它把波形映射到时延多普勒二维平面上，给出\"对目标距离+速度的联合响应\"。"
part: "Part II"
chapter: 5
chapterTitle: "模糊函数——模拟波形"
chapterTitleEn: "Ambiguity Function - Analog Waveforms"
section: "0"
kind: "code"
order: 5999
tags: ["雷达系统", "第5章", "代码实践"]
source: "《雷达系统分析与设计（MATLAB版）》第 3 版 · 第 5 章代码"
---

## 1. 章节概述

**模糊函数 (Ambiguity Function, AF)** 是雷达波形分析的核心工具，它把波形 $s(t)$ 映射到**时延-多普勒二维平面** $\chi(\tau, f_d)$ 上，给出"对目标距离+速度的联合响应"。

本章 22 个代码文件可归为四类：

1. **基础工具**（2 个）：`sinc.m`、各种 `run_*` 启动脚本；
2. **单脉冲模糊函数**（2 个）：`single_pulse_ambg.m` + `Fig5_2.m` + `Fig5_4.m`；
3. **LFM 模糊函数**（4 个）：`lfm_ambg.m` + `Fig5_5.m` + `Fig5_6.m` + `train_lfm.m` + `train_ambg_lfm.m` + `Fig5_10.m`；
4. **脉冲串模糊函数**（多种实现）：`train_ambg.m` / `train_ambg_vectorized.m` / `train_ambg_lfm.m` / `train_ambg_SFW.m` / `train_lfm.m` / `train_SWF.m` 及对应 `run_*.m` / `Fig*.m`；
5. **NLFM 预备**（1 个）：`Fig5_15.m`（群延迟函数 Pade 近似）；
6. **失配辅助**（1 个）：`Figextra.m`。

学习目标：
- 掌握模糊函数的定义和物理意义
- 理解"图钉"、"刀刃"、"斜板"三种典型模糊图的特征
- 学会分析距离-多普勒耦合（LFM）
- 掌握步进频率波形 (SFW) 的合成带宽原理
- 了解 NLFM 设计思想

## 2. 代码清单表格

### 2.1 基础工具

| 文件名 | 类型 | 功能简述 |
|--------|------|---------|
| `sinc.m` | 函数 | 受保护的 $\sin(x)/x$（避免 0/0） |
| `run_train_ambg.m` | 脚本 | 调用 `train_ambg` 并绘图 |
| `run_train_ambg_lfm.m` | 脚本 | 调用 `train_ambg_lfm` 并绘图 |
| `run_train_ambg_vectorized.m` | 脚本 | 调用 `train_ambg_vectorized` 并绘图 |

### 2.2 单脉冲 / LFM 单脉冲模糊函数

| 文件名 | 类型 | 功能简述 | 对应公式 |
|--------|------|---------|---------|
| `single_pulse_ambg.m` | 函数 | 单脉冲模糊函数（绝对值） | Eq. 5.13 |
| `lfm_ambg.m` | 函数 | LFM 模糊函数（平方） | Eq. 5.21 |
| `train_lfm.m` | 函数 | LFM 脉冲串（双重循环版） | Eq. 5.43 |

### 2.3 脉冲串模糊函数（多种实现）

| 文件名 | 类型 | 功能简述 | 对应公式 |
|--------|------|---------|---------|
| `train_ambg.m` | 函数 | 均匀脉冲串（meshgrid 向量化） | Eq. 5.37 |
| `train_ambg_vectorized.m` | 函数 | 均匀脉冲串（向量化） | Eq. 5.37 |
| `train_ambg_lfm.m` | 函数 | LFM 脉冲串 | Eq. 5.43 |
| `train_ambg_SFW.m` | 函数 | 步进频率波形脉冲串 | 自定义 |
| `train_SWF.m` | 函数 | 步进频率波形（双重循环） | 自定义 |

### 2.4 复现教材图（Fig*）

| 文件名 | 复现内容 | 关键参数 |
|--------|---------|---------|
| `Fig5_2.m` | Fig. 5.2 单脉冲 AF (3D + 等高线) | $\tau=3$ s |
| `Fig5_4.m` | Fig. 5.4 单脉冲零多普勒切面 | sinc 形状 |
| `Fig5_5.m` | Fig. 5.5 LFM AF (3D + 等高线) | $\tau=1$, $B=5$ Hz |
| `Fig5_6.m` | Fig. 5.6 LFM 零多普勒切面 (dB) | $\tau=1$, $B=20$ Hz |
| `Fig5_8.m` | Fig. 5.8 均匀脉冲串 AF (5 个) | $N=5$ |
| `Fig5_9a.m` | Fig. 5.9a 均匀脉冲串 AF (双重循环) | $N=6$ |
| `Fig5_10.m` | Fig. 5.10 LFM 脉冲串 AF (3 个) | $BT=4$, $N=3$ |
| `Fig5_13.m` | Fig. 5.13 步进频率波形 AF (3 个) | $N=3$ |
| `Fig5_15.m` | Fig. 5.15 Pade 近似群延迟函数 | $n=1\sim 4$ |
| `Figextra.m` | chirp 失配实验 | 辅助 |

> 注：原文件名为 `Fig5_15.m.m`（双重扩展名），已在整理版中重命名为 `Fig5_15.m`；`00_CodeReference/` 保留原名。

## 3. 代码详解

### 3.1 基础工具：`sinc.m`

MATLAB 自带 `sinc(x) = sin(πx)/(πx)`，而本函数定义 `sinc(x) = sin(x)/x`——与教材公式一致。

```matlab
function y = sinc(x)
if abs(x) < 0.001
    y = 1.0;   % 极限值
else
    y = sin(x) / x;
end
```

**作用**：在 $\sin(\text{val})/\text{val}$ 形式的模糊函数中防止 0/0。

---

### 3.2 单脉冲模糊函数

#### 3.2.1 `single_pulse_ambg.m`（Eq. 5.13）

$$
|\chi(\tau, f_d)| = \left(1 - \frac{|\tau|}{\tau_0}\right) \cdot \left|\frac{\sin[\pi f_d(\tau_0 - |\tau|)]}{\pi f_d(\tau_0 - |\tau|)}\right|
$$

**实现**：
```matlab
val1 = 1.0 - abs(tau)/taup;                                    % 三角包络
val2 = pi*taup*(1.0 - abs(tau)/taup) .* fd;                   % sinc 自变量
x(:, i) = abs(val1 .* sin(val2+eps) ./ (val2+eps));           % 模糊函数绝对值
```

**关键特征**：
- $\tau$ 方向：三角形包络，宽度 $2\tau_0$；
- $f_d$ 方向：sinc 函数，第一零点 $f_d = 1/\tau_0$；
- 整体形状：**图钉 (Thumbtack)**——主峰居中，但多普勒旁瓣较高（−13 dB）。

#### 3.2.2 `Fig5_2.m` + `Fig5_4.m`

`Fig5_2.m` 绘制 3D mesh + 等高线图；`Fig5_4.m` 单独展示 $f_d$ 切面（即 $\tau=0$ 时的 $|\chi(0, f_d)| = |\text{sinc}(\pi f_d \tau_0)|$）。

---

### 3.3 LFM 模糊函数

#### 3.3.1 `lfm_ambg.m`（Eq. 5.21）

$$
|\chi(\tau, f_d)|^2 = \left(1 - \frac{|\tau|}{\tau_0}\right)^2 \cdot \text{sinc}^2\left[\pi (f_d + \mu \tau)(\tau_0 - |\tau|)\right]
$$

其中 $\mu = \text{up\_down} \cdot B/\tau$ 是**调频斜率**。

**关键洞察**：`val3 = (fd + mu*tau)` 项揭示了**距离-多普勒耦合**——LFM 的模糊函数峰值不在 $(\tau=0, f_d=0)$，而是沿直线 $f_d = -\mu\tau$ 倾斜。

**形状特征**：**倾斜刀刃 (Tilted Ridge)**——刀刃与 $\tau$ 轴成角度 $\arctan(\mu)$，BT 越大刀刃越尖锐。

#### 3.3.2 `Fig5_5.m` + `Fig5_6.m`

`Fig5_5.m` 用 $\sqrt{x}$ 还原 $|\chi|$（因 `lfm_ambg` 返回平方值），3D + 等高线展示；`Fig5_6.m` 取 $f_d=0$ 切面，距离方向仍是 sinc 形状。

---

### 3.4 脉冲串模糊函数

#### 3.4.1 `train_ambg.m`（Eq. 5.37）

**核心思想**：

$$
|\chi_{\text{train}}(\tau, f_d)| = \underbrace{|\chi_{\text{single}}(\tau, f_d)|}_{\text{单脉冲}} \cdot \underbrace{\left|\frac{\sin[\pi f_d (N - |q|) T_r]}{N \sin(\pi f_d T_r)}\right|}_{\text{脉冲串因子 (Dirichlet 核)}}
$$

其中 $T_r$ 是 PRI，$q$ 是脉冲索引。

**物理意义**：
- **距离方向**：周期性峰，间隔 PRI；主瓣宽度 $1/(NB)$；
- **多普勒方向**：周期性峰，间隔 $1/\text{PRI}$；主瓣宽度 $1/(NT)$；
- **特征**：**棋盘格状 (Bed of Nails)**。

**实现**：
```matlab
q = -(n-1):1:(n-1);
[Q, S] = meshgrid(q, offset);
% 单脉冲项
val1 = 1.0 - (abs(T))/taup;
val2 = pi*taup*F.*val1;
val3 = abs(val1.*sin(val2+eps) ./ (val2+eps));
% 脉冲串因子
val4 = abs(sin(pi*F.*(N-abs(Q))*pri+eps) ./ sin(pi*F*pri+eps));
x = val3.*val4 ./ N;
```

#### 3.4.2 `train_ambg_vectorized.m`

与 `train_ambg.m` 数学等价，但用更精简的 `meshgrid` 模式，效率略高。

#### 3.4.3 `train_ambg_lfm.m`（Eq. 5.43）

在 `train_ambg.m` 基础上，单脉冲项替换为 LFM 形式：

```matlab
val2 = pi*taup*(F + T*(bw/taup)) .* val1;   % 注意多普勒-时延耦合项 T*bw/taup
val3 = abs(val1.*sin(val2+eps) ./ (val2+eps));
val4 = abs(sin(pi*F.*(N-abs(Q))*pri+eps) ./ sin(pi*F*pri+eps));
x = val3.*val4 ./ N;
```

**结果**：兼具 LFM 的倾斜刀刃 + 脉冲串的周期峰。

#### 3.4.4 `train_ambg_SFW.m` — 步进频率波形

**SFW 原理**：
- N 个脉冲载频步进 $\Delta f$；
- 总合成带宽 $B_{\text{total}} = B + (N-1)\Delta f$；
- **距离分辨率** $\Delta R = c / (2 B_{\text{total}})$，远优于单脉冲；
- **不模糊距离窗** $\Delta R_{\text{unamb}} = c / (2 \Delta f)$（由步进量决定）。

```matlab
% 单脉冲项使用总带宽
val2 = pi*taup*(F + T*(bw + (n-1)*bi)/taup) .* val1;
% 脉冲串因子含步进频耦合
val4 = abs(sin(pi*(F + T*bi/pri).*(N-abs(Q))*pri+eps) ./ sin(pi*(F + T*bi/pri)*pri+eps));
```

#### 3.4.5 `train_lfm.m` / `train_SWF.m`（双重循环版）

与对应 `train_ambg_*.m` 等价，但用 `for` 循环实现。优点是**更直观**、易于改写；缺点是**慢**，对大 N 或高分辨率不适用。

#### 3.4.6 `Fig5_8.m` / `Fig5_9a.m` / `Fig5_10.m` / `Fig5_13.m`

四个图分别展示：
- `Fig5_8.m`：5 个均匀脉冲串（$N=5$）；
- `Fig5_9a.m`：6 个均匀脉冲串（双重循环版，$N=6$）；
- `Fig5_10.m`：3 个 LFM 脉冲串（$BT=4$, $N=3$）；
- `Fig5_13.m`：3 个 SFW 脉冲串。

这些图直观展示了脉冲数 $N$、带宽 $B$、调频斜率 $\mu$ 对模糊函数形状的影响。

---

### 3.5 NLFM 预备：`Fig5_15.m`

**功能**：绘制非线性调频（NLFM）设计中，不同阶 Pade 近似的群延迟函数 $T(\omega)$。

**数学原理**：
驻定相位原理：

$$
T(\omega) = \frac{d\varphi(\omega)}{d\omega}
$$

即**群延迟 = 相位对频率的导数**。NLFM 通过指定 $T(\omega)$ 来间接控制 $\varphi(\omega)$，从而设计调频规律。

**实现**：
```matlab
delw = linspace(-0.5, 0.5, 75);  % 归一化频率偏差
T1 = 0.5 * sin(pi .* delw);
T2 = delw + (1/2/pi) .* sin(2*pi .* delw);
T3 = 0.25 .* (sin(pi .* delw)) .* ((cos(pi .* delw)).^2 + 2);
T4 = delw + (1/2/pi) .* sin(2*pi .* delw) + (2/3/pi) .* (cos(pi .* delw)).^3 .* sin(delw);
plot(delw, T1, 'k*', delw, T2, 'k:', delw, T3, 'k.', delw, T4, 'k')
```

**应用**：NLFM 可以实现**不加窗的低副瓣**——是 LFM 距离-多普勒耦合与副瓣抑制的折中方案。

---

### 3.6 辅助：`Figextra.m`

与 `mismatch.m` 类似，演示 chirp 中心频率/脉宽失配下的压缩输出衰减。

---

## 4. 代码串联叙述

本章代码围绕**"模糊函数"这一核心工具**展开，构成"由简入繁"的层次结构：

### 主题一：单脉冲的"图钉"图

`single_pulse_ambg.m` + `Fig5_2.m` + `Fig5_4.m` 给出最基础的模糊图——**图钉 (Thumbtack)**。

$$
\chi_{\text{single}}(\tau, f_d) = \text{三角}(\tau) \times \text{sinc}(f_d)
$$

教学要点：
- 距离方向：$2\tau_0$ 宽的三角形包络；
- 多普勒方向：sinc 旁瓣（−13 dB）；
- **无耦合**——这是最理想的"理想化"波形，但**时宽带宽积 BT=1**，不能同时获得远距离与高分辨率。

### 主题二：LFM 的"倾斜刀刃"

`lfm_ambg.m` + `Fig5_5.m` + `Fig5_6.m` 揭示 LFM 的核心特征——**距离-多普勒耦合**：

$$
\chi_{\text{LFM}}(\tau, f_d) = \text{三角}(\tau) \times \text{sinc}(f_d + \mu \tau)
$$

**正反两面**：
- **正面**：模糊图沿 $\mu \tau + f_d = 0$ 倾斜刀刃化，主瓣尖锐 → **距离分辨率高**（$B\tau$ 越大越好）；
- **反面**：距离和多普勒**不能同时精确测得**——耦合引入测量误差。

工程意义：LFM 适合**已知多普勒**的跟踪雷达（"先测速、再去斜"）；不适合距离+速度同时未知的搜索雷达。

### 主题三：脉冲串的"棋盘格"

`train_ambg.m` + `train_ambg_vectorized.m` + `Fig5_8.m` + `Fig5_9a.m` 展示 $N$ 个相干脉冲串的模糊图——**棋盘格 (Bed of Nails)**。

**关键参数**：
- 距离峰间隔 = PRI；
- 多普勒峰间隔 = 1/PRI；
- **距离和多普勒都存在模糊**——这是脉冲串的固有问题。

**主瓣宽度**：
- 距离主瓣 $1/(NB)$；
- 多普勒主瓣 $1/(NT)$，$T = N \times \text{PRI}$ 是驻留时间。

工程意义：通过选择 PRI 在距离和多普勒模糊之间做权衡——低 PRI（高 PRF）测速不模糊但距离模糊；高 PRI 测距不模糊但速度模糊。

### 主题四：LFM 脉冲串——"刀刃+棋盘"

`train_ambg_lfm.m` + `train_lfm.m` + `Fig5_10.m` 把 LFM 与脉冲串结合：
- **每个脉冲**有 LFM 倾斜刀刃；
- **整体**有脉冲串棋盘格；
- **整体效果**：刀刃状的"刻面"，在每个 PRI 间隔都重复。

这正是实际脉冲多普勒雷达 (PD) 使用的波形。

### 主题五：步进频率波形 (SFW)

`train_ambg_SFW.m` + `train_SWF.m` + `Fig5_13.m` 展示 SFW：
- 每个脉冲**载频不同**（步进 $\Delta f$）；
- 处理时**合成**为大带宽 $B_{\text{total}} = N \Delta f$；
- 距离分辨率 $\Delta R = c / (2 B_{\text{total}})$；
- 不模糊距离窗 $\Delta R_{\text{unamb}} = c / (2 \Delta f)$。

工程意义：SFW 用 $N$ 个**窄带脉冲**合成**宽带**效果，避免直接发射宽带信号对硬件的压力。这是 Chap 7 脉冲压缩的核心预备知识。

### 主题六：NLFM 与失配分析

- `Fig5_15.m`：通过 Pade 近似设计非线性调频，可实现不加窗的低副瓣；
- `Figextra.m`：演示失配下的脉冲压缩衰减。

### 主题七：算法实现选择

代码同时提供了**双重循环**和**meshgrid 向量化**两种实现：
- 双重循环（`train_lfm.m`, `train_SWF.m`, `Fig5_9a.m`）：直观、易调试；
- 向量化（`train_ambg*.m`）：快速、可扩展。

教学意义：**学会用两种范式表达同一算法**是工程能力的关键。

---

## 5. 关键公式汇总

### 5.1 模糊函数定义（Eq. 5.9）

$$
\chi(\tau, f_d) = \int_{-\infty}^{\infty} s(t) s^*(t - \tau) e^{j 2\pi f_d t} dt
$$

### 5.2 单脉冲模糊函数（Eq. 5.13）

$$
|\chi(\tau, f_d)| = \left(1 - \frac{|\tau|}{\tau_0}\right) \left|\text{sinc}[\pi f_d (\tau_0 - |\tau|)]\right|
$$

### 5.3 LFM 模糊函数（Eq. 5.21）

$$
|\chi(\tau, f_d)|^2 = \left(1 - \frac{|\tau|}{\tau_0}\right)^2 \text{sinc}^2\left[\pi (f_d + \mu \tau)(\tau_0 - |\tau|)\right]
$$

$$
\mu = \pm B/\tau \quad (\text{调频斜率})
$$

### 5.4 均匀脉冲串模糊函数（Eq. 5.37）

$$
|\chi_{\text{train}}(\tau, f_d)| = \frac{1}{N} |\chi_{\text{single}}(\tau, f_d)| \cdot \left|\frac{\sin[\pi f_d (N - |q|) T_r]}{\sin(\pi f_d T_r)}\right|
$$

### 5.5 LFM 脉冲串模糊函数（Eq. 5.43）

$$
|\chi_{\text{LFM,train}}| = \frac{1}{N} \left(1 - \frac{|\tau|}{\tau_0}\right) \left|\frac{\sin[\pi(f_d + \mu\tau)(\tau_0 - |\tau|)]}{\pi(f_d + \mu\tau)(\tau_0 - |\tau|)}\right| \cdot \left|\frac{\sin[\pi f_d (N - |q|) T_r]}{\sin(\pi f_d T_r)}\right|
$$

### 5.6 步进频率波形 (SFW)

- 第 $i$ 个脉冲频率：$f_i = f_0 + i \cdot \Delta f$
- 合成带宽：$B_{\text{total}} = B + (N-1)\Delta f$
- 距离分辨率：$\Delta R = c / (2 B_{\text{total}})$
- 不模糊距离窗：$\Delta R_{\text{unamb}} = c / (2 \Delta f)$

### 5.7 距离-多普勒耦合

LFM 模糊函数峰值沿直线 $f_d = -\mu \tau$ 倾斜；多普勒频移 $f_d$ 引入的**距离误差**：

$$
\Delta R_{\text{coupling}} = \frac{c \cdot f_d}{2 \mu}
$$

### 5.8 群延迟与驻定相位（NLFM 基础）

$$
T(\omega) = \frac{d\varphi(\omega)}{d\omega}
$$

### 5.9 模糊函数性质

- **体积守恒**：$\iint |\chi(\tau, f_d)|^2 d\tau df_d = 1$（能量归一化）
- **原点值**：$\chi(0, 0) = \int |s(t)|^2 dt = 2E$（总能量）
- **原点对称性**：$|\chi(\tau, f_d)| = |\chi(-\tau, -f_d)|$

---

## 6. 章节总结

### 核心学习要点

1. **模糊函数是"二维脉冲响应"**：它告诉我们一个波形对**任意距离+速度组合**的目标的响应；
2. **三大典型形状**：
   - **图钉 (Thumbtack)**——单脉冲，理想但 BT=1；
   - **倾斜刀刃 (Tilted Ridge)**——LFM，距离-多普勒耦合；
   - **棋盘格 (Bed of Nails)**——均匀脉冲串，周期峰。
3. **距离-多普勒耦合是 LFM 的本质**：$f_d + \mu \tau$ 项揭示了"测距与测速不可兼得"；
4. **脉冲串引入周期性模糊**：选择 PRI 是在距离模糊和多普勒模糊之间权衡；
5. **SFW 用时间换带宽**：$N$ 个窄脉冲合成大带宽，是工程中实现高分辨率的常用方案；
6. **NLFM 是不加窗的低副瓣方案**：通过 Pade 近似设计群延迟函数，避开 LFM 加窗带来的主瓣展宽。

### 实践建议

- **运行 `Fig5_2.m` → `Fig5_5.m` → `Fig5_8.m` → `Fig5_10.m` → `Fig5_13.m`**，对比五种模糊图的"长相"；
- 在 `lfm_ambg.m` 中改变 $B/\tau$（增大调频斜率 $\mu$），观察刀刃变陡的过程；
- 在 `train_ambg.m` 中改变 $N$，看主瓣变窄的代价（旁瓣峰增多）；
- **思考**：当目标多普勒 $f_d$ 很大时，LFM 的距离测量误差有多大？SFW 能否缓解？
- 比较 `train_ambg.m`（向量化）和 `train_lfm.m`（循环）的运行时间——理解"工程实现选择"。

### 与后续章节的联系

- **Chap 6**：将模拟波形的模糊函数扩展到**离散编码**（Barker 码、PRN 码等）；
- **Chap 7**：把 SFW 思想工程化为**步进频率脉冲压缩**和 **Stretch 处理**；
- **Chap 10**：模糊函数中的"距离/多普勒模糊"在 MTI/PD 雷达中有明确的解决策略；
- **Chap 13**：模糊函数与**目标起伏模型**结合，导出检测概率的完整计算。

模糊函数是雷达波形设计的"试金石"——任何新波形都应先画它的模糊图，再讨论性能。
