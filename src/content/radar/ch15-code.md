---
title: "相控阵天线 · 代码实践"
titleEn: ""
summary: "本章系统讲述 Phased Array Antenna（相控阵天线）的理论基础与计算实现：从最基本的均匀线阵出发，扩展到平面阵列（矩形/圆形）、单脉冲测向、扫描损失等核心议题。代码上以 FFT 加速方向图计算为主要技术路线，辅以多种窗函数（…"
part: "Part V"
chapter: 15
chapterTitle: "相控阵天线"
chapterTitleEn: "Phased Array Antennas"
section: "0"
kind: "code"
order: 15999
tags: ["雷达系统", "第15章", "代码实践"]
source: "《雷达系统分析与设计（MATLAB版）》第 3 版 · 第 15 章代码"
---

---

## 一、章节概述

本章系统讲述 **Phased Array Antenna（相控阵天线）** 的理论基础与计算实现：从最基本的均匀线阵出发，扩展到平面阵列（矩形/圆形）、单脉冲测向、扫描损失等核心议题。代码上以 **FFT 加速方向图计算** 为主要技术路线，辅以多种窗函数（Hamming/Hanning/Kaiser/Blackman）抑制旁瓣，并通过 GUI 工具把参数设置可视化。

### 学习目标
1. 掌握阵列因子 $AF(\theta) = \sum_n w_n e^{j n \psi}$ 的物理意义
2. 理解 FFT 与方向图的关系：方向图 = 加权向量的 FFT
3. 掌握矩形/圆形平面阵列的 3D 方向图
4. 理解扫描损失 $\text{sinc}^{-4}$ 现象
5. 掌握单脉冲（Monopulse）和/差比幅测角

---

## 二、代码清单表格

| # | 文件名 | 功能简述 | 教材公式/章节 |
|---|--------|----------|--------------|
| 1 | `linear_array.m` | 均匀线阵方向图（FFT + 加窗 + 移相器量化） | Eq.15.35 + 15.x |
| 2 | `linear_array_FFT.m` | 加权向量直接 FFT 计算方向图 | FFT 关系式 |
| 3 | `circ_array.m` | 圆形平面阵列（Allen 算法截取） | Eq.15.70~15.80 |
| 4 | `circular_array.m` | 圆环阵列 2D 方向图（短偶极子阵元） | Eq.15.40~15.50 |
| 5 | `rect_array.m` | 矩形平面阵列 3D 方向性增益 | Eq.15.50~15.65 |
| 6 | `rec_to_circ.m` | 方阵截取为圆阵（Allen 算法） | Allen 截取 |
| 7 | `la_sampled_wave.m` | 均匀线阵空间采样导向矢量 | $\mathbf{a}(\theta)$ |
| 8 | `array.m` | 平面阵列 GUI 驱动（GUIDE 自动） | GUI |
| 9 | `planar_array_gui.m` | 平面阵列 GUI 驱动（第二版） | GUI |
| 10 | `linear_array_gui.m` | 线性阵列 GUI 驱动 | GUI |
| 11 | `initialize.m` | GUI 初始化参数 | GUI 辅助 |
| 12 | `display_pattern.m` | 矩形阵列计算时间与内存测试 | 性能测试 |
| 13 | `fxdwght.m` | α-β-γ 定权跟踪器（GHK 简化） | Eq.17.x (前置) |
| 14 | `mono_pulse.m` | 单脉冲和/差方向图与角误差信号 | Eq.15.85~15.95 |
| 15 | `scan_loss.m` | 扫描损失（扫描角 vs 增益） | Eq.15.50 |
| 16 | `Fig15_5.m` | N=8 均匀线阵方向图（线性/dB/极坐标） | Eq.15.35 |
| 17 | `Fig15_7.m` | 窗函数频域响应对比 | 窗函数频谱 |
| 18 | `Fig15_50.m` | 扫描损失曲线（d=0.6λ） | Eq.15.50 |
| 19 | `Fig15_51.m` | 扫描损失曲线（与 Fig15_50 等价） | Eq.15.50 |

---

## 三、核心代码详解

### 3.1 `linear_array.m` - 均匀线阵（FFT + 加窗 + 移相器）

**阵列因子公式**：
$$
AF(\theta) = \sum_{n=0}^{N-1} w_n e^{j n \psi}, \quad \psi = \frac{2\pi d}{\lambda} \sin\theta - \beta
$$

其中 $\beta$ 是第 0 阵元（参考阵元）的扫描相位。

**关键技术**：
1. **FFT 关系**：$F(u) = \text{FFT}\{w_n\}$，其中 $u = \sin\theta$ 是空间频率
2. **可见空间**：$|u| \leq 1$（即 $|\theta| \leq \pi/2$）
3. **移相器量化**（$n$ bits）：
   - 量化步长 $\Delta\phi = 2\pi/2^n$
   - 相位 $\psi_n = \text{round}(d \sin\theta_0 \cdot n \cdot 2^n) \cdot \Delta\phi$

**关键代码段**：
```matlab
% FFT 大小选取
nfft = 2^(ceil(log(Nrx)/log(2)));   % Nrx = 10*N
if nfft < 256, nfft = 256; end

% 移相器量化 (nbits >= 0)
if nbits < 0
   phase0 = exp(i*2.0*pi .* n * dolr * sintheta0);
else
    levels = 2^nbits;
    qlevels = 2.0 * pi / levels;
    % 关键: round() 到最近量化层
    angleq = round(dolr .* n * sintheta0 * levels) .* qlevels;
    phase0 = exp(i*angleq);
end

% 加窗
if winid < 0
    wr(1:Nr) = 1;
else
    wr = win';
end
wr = wr .* phase0;     % 幅度加权 × 移相

% 方向图 = 归一化 FFT
patternv = (abs(fftshift(fft(w,nfft)))).^2;
patternr = 10*log10(patternv(idx) ./ Nr + eps);
% 方向性增益
rbarr  = 0.5 *sum(patternv(idx)) ./ (nfft * dol);
patterng = 10*log10(patternv(idx) + eps) - 10*log10(rbarr + eps);
```

**意义**：通过 FFT 将 $O(NK)$ 复杂度的角度扫描降到 $O(N\log N)$，且能自然处理加窗与移相器量化。

---

### 3.2 `linear_array_FFT.m` - 通用 FFT 方向图计算

**核心实现**（更紧凑版）：
```matlab
% 阵元间距 > 0.5λ 时升采样
if dol<=0.5,
    Nr = Nelt; dolr = dol;
else
    ratio = ceil(dol/0.5);
    Nr = Nelt * ratio;
    dolr = dol/ratio;
    a = zeros(1, Nr);
    a(1: ratio: Nr) = atemp(1: Nelt);    % 零内插
end
nfft = 65536;        % 大点数 FFT 提升角度分辨率
A = fftshift(fft(a, nfft));

% 空间频率 u = sin(theta)
u = [-nfft/2 : nfft/2-1] * (1/dolr/nfft);
k = find(abs(u)<=1);     % 可见空间
R = (abs(A(k))).^2;       % 辐射强度
theta = asin(u(k));
% 方向性增益
Rbar = 0.5 * sum(R) / (nfft*dol);
G = R / Rbar;
```

**关键技术**：用大点数 FFT（65536）实现高分辨率角度扫描，且通过零内插处理 $d/\lambda > 0.5$ 的情况。

---

### 3.3 `rect_array.m` - 矩形平面阵列

**平面阵列因子**（2D 形式）：
$$
AF(\theta,\phi) = \sum_m \sum_n w_{mn} e^{j(2\pi/\lambda)(m d_x u + n d_y v)}
$$

其中 $u = \sin\theta\cos\phi$，$v = \sin\theta\sin\phi$。

**关键实现**（用 `fft2` 加速）：
```matlab
% 移相器量化
if nbits < 0
    phasem = exp(i*2*pi*dolx*u0 .* nx *ratiox);
    phasen = exp(i*2*pi*doly*v0 .* ny *ratioy);
else
    levels = 2^nbits;
    qlevels = 2.0*pi / levels;
    sinthetaq = round(dolx .* nx * u0 * levels * ratiox) .* qlevels;
    sinphiq   = round(doly .* ny * v0 * levels *ratioy) .* qlevels;
    phasem = exp(i*sinthetaq);
    phasen = exp(i*sinphiq);
end
% 加窗 + 移相
array = array .* (transpose(phasem) * phasen);

% fft2 计算方向图
arrayfft = abs(fftshift(fft2(w,nfftx,nffty))).^2;

% 归一化增益
rbar=sum(sum(arrayfft(indexx,indexy))) / dolx/doly/4./nfftx/nffty;
arrayfft = arrayfft(indexx,indexy) ./rbar;

% 可视化
figure; mesh(V,U,pattern);     % 3D mesh
figure; contour(V,U,pattern);  % 等高线
figure; plot(...);             % 阵元布局
```

**输出**：
- `figure(1)`：3D 方向图 mesh
- `figure(2)`：等高线图
- `figure(3)`：阵元空间分布

---

### 3.4 `circ_array.m` - 圆形平面阵列（Allen 截取）

**核心技术**：从 N×N 方阵截取为圆形（Allen 算法），调用 `rec_to_circ.m`：

```matlab
function amn = rec_to_circ(N)
midpoint = (N-1)/2 + 1;
amn = zeros(N);
for i = 1:N
    for j = 1:N
        distance(i,j) = sqrt((x0-i)^2 + (y0-j)^2);
    end
end
idx = find(distance < (N-1)/2 + .025);  % 容差 0.025
amn (idx) = 1;
return
```

**物理意义**：圆形阵列相比矩形阵列有更好的方位对称性，可降低方向图的方位调制（azimuth modulation），适合全方位扫描雷达。

**与 `rect_array.m` 的区别**：
- 多一步 `rec_to_circ()` 把方阵 mask 出来
- 增加一个 figure 画圆形阵元位置
- 其余 fft2 计算与矩形阵列相同

---

### 3.5 `circular_array.m` - 圆环阵列（短偶极子阵元）

**圆环阵列因子**（N 阵元均匀分布，半径 $a$）：
$$
AF(\theta,\phi) = \sum_{n=1}^{N} I_n e^{j\alpha_n} \cdot e^{j k a [\sin\theta \cos(\phi-\phi_n) - \sin\theta_0 \cos(\phi_0-\phi_n)]}
$$

其中 $\phi_n = 2\pi n/N$。

**单元因子**（短偶极子沿 z 轴）：$E(\theta) = \sin\theta$

**总场**：$E_{total} = E(\theta) \cdot AF$

**关键代码**：
```matlab
% 单元位置
for n = 1:N
    phin(n) = 2*pi*n/N;       % 阵元方位角
end
% 阵列因子 (Theta 变化，Phi 固定)
for theta = 0.001:1:181
    Arrayfactor(i) = 0;
    for n = 1:N
        Arrayfactor(i) = Arrayfactor(i) + I(n)*exp(j*alpha(n)) ...
                       * exp( jka*(sin(thetar(i))*cos(phir -phin(n))) ...
                             -jka*(sin(theta0r  )*cos(phi0r-phin(n)))  );
    end
end
Element(i) = abs(sin(thetar(i)));   % 短偶极子单元方向图
EtotalR = (Element.*Arrayfactor)/max(Element.*Arrayfactor);
```

**输出**：
- `figure(1)` 线性方向图
- `figure(2)` 功率方向图（dB）
- `figure(3/4)` 极坐标
- `figure(10)` 单元/阵列/总场三联图

---

### 3.6 `mono_pulse.m` - 单脉冲和/差测角

**核心技术**：通过两个偏置波束 $y_1, y_2$ 形成和/差波束。

$$
y_1(\theta) = \text{sinc}(\theta + \phi_0), \quad y_2(\theta) = \text{sinc}(\theta - \phi_0)
$$

$$
y_{sum} = y_1 + y_2, \quad y_{diff} = y_2 - y_1
$$

**角误差信号**（归一化）：
$$
\frac{\Delta}{\Sigma} = \frac{y_{diff}}{y_{sum}}
$$

**关键代码**：
```matlab
phi0 = 0.12;   % 偏置角
angle = -pi:0.01:pi;
y1 = sinc(angle + phi0);
y2 = sinc((angle - phi0));
ysum = y1 + y2;
ydif = -y1 + y2;
% 角误差信号（瞄准轴附近近似线性）
dovrs = ydif ./ ysum;
```

**意义**：单脉冲雷达是精密跟踪雷达的核心。`dovrs` 在 $\theta=0$ 附近斜率 = 角灵敏度（用于闭环伺服控制）。

---

### 3.7 `scan_loss.m` & `Fig15_50.m` - 扫描损失

**核心公式**（Eq.15.50）：
$$
L_{scan}(\beta) = \left(\frac{\sin(\pi d \sin\beta)}{\pi d \sin\beta}\right)^{-4}
$$

**物理意义**：当相控阵波束从法向扫描到 $\beta$ 角时：
1. 有效孔径在波束方向投影减小（因子 $\cos\beta$）
2. 阵元方向图对非正入射响应下降（与 sinc 函数相关）
3. 综合作用使主瓣增益按 $\text{sinc}^{-4}$ 下降

**关键代码**：
```matlab
d = 0.6;  % 阵元间距（波长单位）
beta = linspace(0, 22.5, 1000) * pi/180;
den = pi*d .* sin(beta);
num = sin(den);
lscan = (num./den).^-4;
LSCAN = 10*log10(lscan+eps);
plot(beta*180/pi, LSCAN);
```

**工程意义**：扫描到 ±60° 时损失可达 4 dB（约 40% 距离损失），实际工程需做扫描损失补偿。

---

### 3.8 `Fig15_5.m` - 8 阵元均匀线阵方向图

**解析公式**（等间距等加权，Eq.15.35）：
$$
AF(\psi) = \frac{\sin(N\psi/2)}{\sin(\psi/2)}
$$

其中 $\psi = 2\pi (d/\lambda) \sin\theta$。

**代码**：
```matlab
nelements = 8; d = 1;  % d=λ
var = sin(theta);   % u = sinθ
num = sin((nelements * k * d * 0.5) .* var);
den = sin((k* d * 0.5) .* var);
pattern = abs(num ./ den);
% 归一化
pattern = pattern ./ max(pattern);
```

**输出**：
- 线性归一化方向图
- 功率方向图（dB，-60 ~ 0 dB 范围）
- 极坐标方向图

**注**：`d=1 > 0.5`（1 个波长），会**出现栅瓣**（grating lobes），可看到多个等高的主瓣。

---

### 3.9 `Fig15_7.m` - 窗函数频域响应对比

**对比的 5 种窗**：
| 窗函数 | 主瓣宽度 | 旁瓣电平 |
|--------|----------|----------|
| 矩形窗（Rectangular）| 最窄 | -13 dB |
| Hamming | 较窄 | -43 dB |
| Hanning | 较宽 | -31 dB |
| Blackman | 宽 | -58 dB |
| Kaiser ($\beta=6$) | 可调 | 可调 |

**代码**：
```matlab
N = 32;
rect = ones(1,32);
ham = hamming(32);
han = hanning(32);
blk = blackman(32);
k6 = kaiser(32,6);
RECT = 20*log10(abs(fftshift(fft(rect, 1024)))./32 +eps);
HAM  = 20*log10(abs(fftshift(fft(ham, 1024)))./32 +eps);
% ... 等等
```

**结论**：加窗使旁瓣降低，但主瓣变宽——是分辨率与泄漏的折中。

---

### 3.10 `la_sampled_wave.m` - 导向矢量

**公式**（空间采样导向矢量）：
$$
\mathbf{a}(\sin\theta) = [1, e^{j k d \sin\theta}, e^{j 2 k d \sin\theta}, \ldots, e^{j (N-1) k d \sin\theta}]^T
$$

**代码**：
```matlab
function s = la_sampled_wave(N, dol, sinbeta)
k = 2*pi* dol * sinbeta;
for m = 1: N
    s(m) = exp(j*(m-1)*k);
end
if size(s,1)==1, s = s.'; end
```

**应用**：在 `adaptive_array_lms.m` 中用于生成目标和干扰的导向矢量。

---

### 3.11 GUI 系列

`array.m`、`planar_array_gui.m`、`linear_array_gui.m` 三个文件均由 MATLAB GUIDE 生成，提供：
- 阵元数 $N_x, N_y$ / 间距 $d_x, d_y$ 输入
- 指向角 $\theta_0, \phi_0$ 输入
- 移相器位数 $n_{bits}$ 设置
- 窗函数选择（5 种）
- 阵列类型（矩形/圆形）切换
- 调用 `rect_array.m`/`circ_array.m`/`linear_array.m` 绘图

`initialize.m` 提供 GUI 默认参数（$N_r=25$, $d/\lambda=0.5$ 等）。

`display_pattern.m` 性能测试脚本：循环测试 `rect_array.m` 不同 $N$ 下的计算时间与内存占用。

---

## 四、代码串联叙述

本章 19 个代码按"一维线阵 → 平面阵列 → 测向技术"的逻辑展开：

1. **基础线阵**（`la_sampled_wave.m`）→ 导向矢量是后续所有算法的"原料"。

2. **FFT 加速**（`linear_array.m` → `linear_array_FFT.m`）→ 通过 FFT 把方向图计算从 $O(NK)$ 降到 $O(N\log N)$，并自然支持加窗与移相器量化。

3. **窗函数对比**（`Fig15_7.m`）→ 5 种窗函数旁瓣抑制能力的对比演示。

4. **方向图实例**（`Fig15_5.m`）→ 8 阵元均匀线阵的解析公式直接计算，可看到主瓣与栅瓣（因 $d=\lambda$）。

5. **平面阵列**（`rect_array.m`）→ 2D 矩形阵列，用 `fft2` 替代双重求和。

6. **圆形阵列**（`circ_array.m` + `circular_array.m` + `rec_to_circ.m`）→ 通过 Allen 算法从方阵截取圆阵，圆形阵列具有更好的方位对称性。

7. **测向技术**（`mono_pulse.m`）→ 单脉冲和/差测角，通过两个偏置波束的差和比提取角误差。

8. **扫描损失**（`scan_loss.m` + `Fig15_50.m` + `Fig15_51.m`）→ 波束扫描到非正入射方向的增益损失，$\text{sinc}^{-4}$ 规律。

9. **GUI 系列**（`array.m`、`planar_array_gui.m`、`linear_array_gui.m` + `initialize.m` + `display_pattern.m`）→ 把上述函数包装成可视化工具。

10. **fxdwght.m** → 注：虽然放在第 15 章，实际是第 17 章 α-β-γ 跟踪器的简化版本（GHK tracker），是 Mathews/Mahafza 教材的章节归属差异。

---

## 五、关键公式汇总

| 公式 | 描述 | 来源 |
|------|------|------|
| $AF = \sum_n w_n e^{j n \psi}$ | 阵列因子 | 通用 |
| $\psi = 2\pi d/\lambda \cdot \sin\theta - \beta$ | 阵元间相位差 | 通用 |
| $AF(\psi) = \sin(N\psi/2)/\sin(\psi/2)$ | 等间距等加权 AF | Eq.15.35 |
| $d \sin\theta = m\lambda$ 栅瓣条件 | 栅瓣位置 | 通用 |
| $G_{dir} = 2N d/\lambda$ | 等加权线阵方向性 | Eq.15.36 |
| $AF(u,v) = \sum_m \sum_n w_{mn} e^{j(2\pi/\lambda)(m d_x u + n d_y v)}$ | 平面阵列 AF | Eq.15.60 |
| $u = \sin\theta\cos\phi, v = \sin\theta\sin\phi$ | UV 空间 | 通用 |
| $L_{scan}(\beta) = [\text{sinc}(\pi d \sin\beta)]^{-4}$ | 扫描损失 | Eq.15.50 |
| $y_1 = \text{sinc}(\theta+\phi_0), y_2 = \text{sinc}(\theta-\phi_0)$ | 偏置波束 | 通用 |
| $\Delta/\Sigma = (y_2-y_1)/(y_2+y_1)$ | 角误差信号 | 通用 |
| $\Delta\phi = 2\pi/2^n$ | 移相器量化步长 | 通用 |

---

## 六、章节总结

本章 19 个文件全面覆盖了相控阵天线的核心内容：

1. **基础理论**：导向矢量、阵列因子、FFT 计算方法
2. **线阵**：均匀加权、FFT 加速、加窗、移相器量化（`linear_array.m`、`linear_array_FFT.m`）
3. **平面阵列**：矩形（`rect_array.m`）、圆形（`circ_array.m`）、圆环（`circular_array.m`）
4. **测向技术**：单脉冲和/差测角（`mono_pulse.m`）
5. **性能分析**：扫描损失（`scan_loss.m`、`Fig15_50.m`）
6. **可视化工具**：GUI 系列（`array.m`、`planar_array_gui.m`、`linear_array_gui.m`）

**学习要点**：
- FFT 是计算方向图的核心加速手段
- 加窗 = 旁瓣抑制 ↔ 主瓣变宽的折中
- 移相器量化（$\Delta\phi = 2\pi/2^n$）会引入量化旁瓣
- 扫描损失是相控阵的固有特性，$\text{sinc}^{-4}$ 规律
- 单脉冲和/差测角是精密跟踪的核心技术
