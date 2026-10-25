---
title: "雷达波传播 · 代码实践"
titleEn: ""
summary: "雷达波从天线发射到目标再返回,沿途经历地球曲率、大气折射、地/海面反射、地形绕射、对流层吸收、雨雪衰减等机制。这些传播效应共同决定了雷达威力图( coverage diagram )、最小可检测 SNR 以及虚警/漏警概率。"
part: "Part III"
chapter: 8
chapterTitle: "雷达波传播"
chapterTitleEn: "Radar Wave Propagation"
section: "0"
kind: "code"
order: 8999
tags: ["雷达系统", "第8章", "代码实践"]
source: "《雷达系统分析与设计（MATLAB版）》第 3 版 · 第 8 章代码"
---

---

## 一、章节概述

雷达波从天线发射到目标再返回,沿途经历**地球曲率、大气折射、地/海面反射、地形绕射、对流层吸收、雨雪衰减**等机制。这些传播效应共同决定了雷达威力图( coverage diagram )、最小可检测 SNR 以及虚警/漏警概率。

**学习目标**
- 掌握大气折射造成的视在距离误差、时延计算方法;
- 理解 Fresnel 反射系数、粗糙海面散射衰减与发散因子的物理意义;
- 学会在球面地球上求解镜像点( r1, r2 )和路径差( ΔR ),并合成多径传播因子 F;
- 掌握球形地球绕射区( diffraction region )的 Airy 函数级数解( Shatz-Polychronopoulos 算法 );
- 掌握对流层氧气/水汽吸收、雨/雪衰减的工程估算方法。

---

## 二、代码清单表格

| # | 文件名 | 类型 | 功能简述 | 教材公式/章节号 |
|---|--------|------|----------|---------------|
| 1 | `multipath.m` | 脚本 | 中间区( interference region )多径传播因子 F 与相对自由空间损耗绘制 | 8.2-8.6 节、F = √(1+ρ²+2ρcosα) |
| 2 | `ref_coef.m` | 函数 | Fresnel 反射系数(水平/垂直极化,复数) | 式 8.62-8.65 |
| 3 | `diffraction.m` | 函数 | 球形地球绕射区单程传播因子( Airy 级数 ) | 式 8.92-8.96 |
| 4 | `atmo_absorp.m` | 函数 | 大气吸收率( O₂ + H₂O,按高度 ) | 式 8.115, 8.117 |
| 5 | `atmo_attn.m` | 函数 | 同 atmo_absorp(接口别名) | 式 8.115, 8.117 |
| 6 | `atmospheric_attn.m` | 函数 | Riemann 累加沿距离积分总衰减 | 式 8.115, 8.117 |
| 7 | `absorption_range.m` | 函数 | 大气吸收 + 仰角几何(把高度映射到距离) | 式 8.115, 8.117 + 几何 |
| 8 | `airyzo1.m` | 函数 | Airy 函数 Ai(x) 的前 nt 个负实轴零点( Newton 迭代 ) | 数学工具 |
| 9 | `divergence.m` | 函数 | 球面反射的发散因子 D | 8.4 节 |
| 10 | `surf_rough.m` | 函数 | 表面粗糙度衰减因子 Sr( Ament 公式 ) | 式 8.69-8.71 |
| 11 | `refraction.m` | 函数 | 分层大气模型下距离误差、视在距离、时延 | 式 8.4-8.47 |
| 12 | `refractivity.m` | 函数 | 10 层大气模型,电离层/对流层距离误差 | 式 8.4-8.47 |
| 13 | `Fig8_7.m` | 脚本 | 复现图 8.7:不同仰角下距离误差 vs 距离 | 8.3 节 |
| 14 | `Fig8_11_12.m` | 脚本 | 复现图 8.11/8.12:海面 Fresnel 反射系数幅度/相位 | 式 8.62-8.65 |
| 15 | `Fig8_13_14.m` | 脚本 | 复现图 8.13/8.14:不同湿度地面反射系数 | 式 8.62-8.65 |
| 16 | `Fig8_17.m` | 脚本 | 复现图 8.17:粗糙面散射 Sr 与 Bessel 修正项 | 式 8.69-8.71 |
| 17 | `Fig8_28.m` | 脚本 | 复现图 8.28:167 MHz 绕射传播因子 | 式 8.96 |
| 18 | `Fig8_29.m` | 脚本 | 复现图 8.29:428 MHz 绕射传播因子 | 式 8.96 |
| 19 | `Fig8_30.m` | 脚本 | 复现图 8.30:中间区+绕射区组合曲线 | 8.6 节 |
| 20 | `Fig8_31.m` | 脚本 | 复现图 8.31:多频段 O₂ 与总吸收 vs 高度 | 式 8.115-8.117 |
| 21 | `Fig8_33.m` | 脚本 | 复现图 8.33:300 MHz / 1 GHz 吸收率 vs 距离 | 式 8.115-8.117 + 几何 |
| 22 | `Fig8_34_35.m` | 脚本 | 复现图 8.34/8.35:500 MHz 多仰角双程大气衰减 | 式 8.115-8.117 |
| 23 | `Fig8_36.m` | 脚本 | 复现图 8.36:雨衰减 dB/km vs 降雨率 | 经验公式 |
| 24 | `Fig8_37.m` | 脚本 | 复现图 8.37:雪衰减 dB/km vs 等效水含量 | 经验公式 |
| 25 | `Fig8_38.m` | 脚本 | 复现图 8.38:水汽衰减 1~400 GHz(22.2 GHz 谐振) | 式 8.117 展开式 |

---

## 三、核心代码详解

### 3.1 `ref_coef.m` —— Fresnel 反射系数(被引用最频繁)

入射波在光滑介质分界面上的反射特性由 Fresnel 公式给出,返回**复数**反射系数(含相位):

```matlab
function [rh, rv] = ref_coef(psi, epsp, epspp)
    eps  = epsp - i*epspp;                    % 复相对介电常数
    psirad = psi * pi/180;
    arg1 = eps - cos(psirad).^2;              % = ε - cos²ψ
    arg2 = sqrt(arg1);
    arg3 = sin(psirad);
    arg4 = eps .* arg3;                        % = ε·sinψ
    rv = (arg4 - arg2) ./ (arg4 + arg2);       % 垂直极化 (式 8.62)
    rh = (arg3 - arg2) ./ (arg3 + arg2);       % 水平极化 (式 8.63)
end
```

**关键解读**
- `arg1 = ε - cos²ψ` 是公式核心:在低掠射角 ψ→0 时,`arg1 ≈ ε - 1`,对海面( ε≈65 )arg1 很大,导致 `|rh|→1`(海面近似全反射)。
- `rh`、`rv` 为复数,`abs()` 取幅度,`angle()` 取相位。低掠射角时 `∠rh ≈ π`,`∠rv ≈ 0`,这就是 multipath 干涉图样随极化不同的根源。
- `Fig8_11_12.m`、`Fig8_13_14.m` 都用此函数扫描 0.01°~90° 的 ψ。

### 3.2 `surf_rough.m` —— 表面粗糙度因子

```matlab
function Sr = surf_rough(hrms, freq, psi)
    psi = psi * pi/180;
    lambda = 3e8 / freq;
    g  = (2*pi*hrms.*sin(psi)./lambda).^2;     % Ament/Beard 参数
    Sr = exp(-2*g);                             % 粗糙面反射幅度衰减
end
```

**物理意义**:海浪越大(hrms 大)、波长越短、掠射角越小,则 g 越大,Sr 越小(镜面反射能量被散射到非镜向)。在 multipath.m 里通过 `rho = |rv| * D * Sr` 与发散因子 D、Fresnel 系数相乘,得到等效反射系数。

### 3.3 `divergence.m` —— 球面发散因子

```matlab
function D = divergence(r1, r2, ht, hr, psi)
    psi = psi * pi/180;
    re = (4/3) * 6375e3;                        % 4/3 等效地球半径
    r  = r1 + r2;
    arg1 = re .* r .* sin(psi) .* cos(psi);
    arg2 = ( (2*r1.*r2./cos(psi)) + re.*r.*sin(psi) ) .* ...
           (1+hr/re) .* (1+hr/re);
    D = sqrt(arg1 ./ arg2);
end
```

**物理意义**:平面地球假设下反射点附近能量不扩散,球面情况下镜面反射区域被"拉长"为椭圆的一部分,导致能量密度下降,D<1。当 ψ→0 时 D→1(平面极限)。

### 3.4 `multipath.m` —— 中间区多径传播因子(最复杂脚本)

这是 Chap 8 的"主程序",完整实现了**球面多径**计算流程。核心步骤:

**(1) 判断目标是否在视距内**

```matlab
range_to_horizon = sqrt(2*re) * (sqrt(ht) + sqrt(hr));
if any(Rd1 > range_to_horizon)
    fprintf('Traget is in diffraction region \n')
    Rd = Rd1(1:index(1)-1);                    % 截断到视距内
end
```

**(2) 球面三角法求镜像点距离 r1、r2**

```matlab
val1 = Rd.^2 - (ht - hr).^2;
val2 = 4 .* (re + hr) .* (re + ht);
r    = 2*re * asin( sqrt(val1./val2) );       % 总地距(地心角)
p    = sqrt(re.*(ht+hr) + r.^2/4) .* 2/sqrt(3);
exci = asin( 2*re.*r.*(ht-hr) ./ p.^3 );
r1   = r/2 - p*sin(exci/3);                    % 雷达到镜像点
r2   = r - r1;                                 % 镜像点到目标
R1   = sqrt( re^2 + (re+hr)^2 - 2*re*(re+hr)*cos(r1/re) );
R2   = sqrt( re^2 + (re+ht)^2 - 2*re*(re+ht)*cos(r2/re) );
psi  = asin( (2*re*hr + hr^2 - R1.^2) ./ (2*re*R1) );
deltaR = R1 + R2 - Rd;                         % 路径差
```

**(3) 合成等效反射系数**

```matlab
[Sr]   = surf_rough(hrms, freq, psi);         % 粗糙度
[D]    = divergence(r1, r2, ht, hr, psi);     % 发散因子
[rh,rv]= ref_coef(psi, epsp, epspp);           % Fresnel 反射
rho    = abs(rv) .* D .* Sr;                  % 等效幅度
phv    = angle(rv);                            % 相位
```

**(4) 多径干涉传播因子**

```matlab
delta_phi = 2*pi*deltaR / lambda;
alpha     = delta_phi + phv;
F = sqrt( 1 + rho.^2 + 2*rho*cos(alpha) );    % 双径干涉公式
F_dbr = 40*log10( F * Ro / Rd );              % dB
```

输出两幅图:(1) F 随距离的 dB 曲线;(2) F_dbr 与自由空间 `F_free = 40·log10(Ro/Rd)` 的对比,清晰展示建设性/破坏性干涉形成的快衰落。

### 3.5 `diffraction.m` —— 绕射区( Shatz-Polychronopoulos 算法)

当目标处于雷达视距外时,只能依靠绕射( diffraction )传播。算法核心是 Airy 函数级数展开:

```matlab
function F = diffraction(freq, hr, ht, R, nt)
    re  = 6373e3 * 4/3;
    c   = 3e8;
    lambda = c/freq;
    r0  = (re*re*lambda/pi)^(1/3);             % 距离尺度
    h0  = 0.5 * (re*lambda*lambda/pi/pi)^(1/3); % 高度尺度
    y   = hr / h0;   z = ht / h0;              % 归一化高度
    [an] = airyzo1(nt);                         % Ai(.) 的前 nt 个零点
    par1 = exp(sqrt(-1)*pi/3);                  % φ = exp(jπ/3)
    pary1 = (2/3).*(an + y*par1).^1.5;
    parz1 = (2/3).*(an + z*par1).^1.5;
    f1n = airy(an + y*par1) .* airy(an + z*par1) .* exp(pary1) .* exp(parz1);
    f1d = par1.^2 .* airy(1,an).^2;
    f1 = f1n ./ f1d;
    for range = 1:length(R)
        x = R(range)/r0;
        f2 = exp( 0.5*(sqrt(3)+sqrt(-1)).*an.*x - pary1 - parz1 );
        F(range) = 2*sqrt(pi*x) * sum( f1.*f2 );
    end
end
```

**输出** `|F|²` 即相对自由空间的单程功率增益(dB)。`nt=1500` 通常足够收敛。教材中 VHF 167 MHz 与 UHF 428 MHz 两个例子分别对应 `Fig8_28.m`、`Fig8_29.m`。

### 3.6 `airyzo1.m` —— Airy 函数零点

Airy 函数 `Ai(x)` 在负实轴有无穷多零点 `a_n`,绕射问题的本征模。用 Newton 迭代 + 渐近展开式初值,1e-12 收敛精度:

```matlab
ii = linspace(1,nt,nt);
u  = 3*pi*(4*ii-1)/8;
u1 = 1./u.^2;
rt0 = -(u.^2).^(1/3) .* (((((-15.5902*u1+0.929844).*u1-0.138889).*u1+0.10417).*u1+1));
while abs((rt-rt0)./rt) > 1e-12
    ai = airy(0, rt0);   ad = airy(1, rt0);
    rt = rt0 - ai./ad;    rt0 = rt;
end
an(ii) = rt;
```

### 3.7 `atmo_absorp.m` / `absorption_range.m` —— 大气吸收率

氧气吸收(式 8.115):
$$
\gamma_{O_2} = \frac{0.4909 \cdot v_1 P^2}{T^{5/2}} \cdot \frac{1}{1+Q\lambda^2}\left(1+\frac{1.39}{\lambda^2}\right)
$$

水汽吸收(式 8.117):
$$
\gamma_{H_2O} = P_h \left[\frac{1}{Q_1+Q\lambda^2} + \frac{1}{Q_2+Q\lambda^2} + \frac{3.43}{\lambda^2}\right]
$$

其中 `T(h) = 288 - 6.7h`、`P(h) = 1015(1-0.02275h)^{5.2561}` 为标准大气模型。`atmo_absorp.m` 直接由高度求吸收率;`absorption_range.m` 额外通过仰角几何把高度映射到距离,便于沿距离积分。

### 3.8 `atmospheric_attn.m` —— 沿距离积分

```matlab
function [Attn, rangei] = atmospheric_attn(gammaO2, gammaH2O, range)
    sum_abs = gammaO2 + gammaH2O;
    delr = 0.10;  rangei = 0:delr:range(end);
    yy1 = spline(range, sum_abs, rangei);
    yint(1) = 0;
    for n = 2:length(rangei)
        yint(n) = yint(n-1) + delr*(yy1(n-1)+yy1(n));   % 梯形积分
    end
    Attn = 1.9 * yint;                                   % 1.9 近似代替 2
end
```

**为何用 1.9?** 因吸收率曲线在高高度剧烈变化(气压骤降),Riemann 累加在端点附近欠估,教材建议乘 1.9 修正。

### 3.9 `refraction.m` 与 `refractivity.m` —— 分层大气折射

两者用相同思路:**把对流层和电离层分成若干层**,在每层用 Snell 定律递推角度:

- 对流层(`h<50km`):`N(h) = N_0 exp(-C_e h)`
- 电离层(Chapman 模型):`p_e = p_{max} exp[(1-z-e^{-z})/2]`,`z = (h-h_m)/H`

```matlab
Bm(k) = acosd( cosd(Bm(k-1)) .* n(j) .* r(j) ./ n(k) ./ r(k) );   % 式 8.31
Am    = asind( cosd(Bm) .* rm ./ rmp1 );                              % 式 8.32
theta = 90 - Bm - Am;                                                % 式 8.35
Rom   = sqrt( Re^2 + rmp1.^2 - 2*Re*rmp1.*cosd(cumsum(theta)) );    % 式 8.34
Rm    = sqrt( rm.^2 + rmp1.^2 - 2*rm.*rmp1.*cosd(theta) );           % 式 8.44
deltaR = cumsum(nR) - Rom;                                            % 式 8.43, 8.47
tT = sum(nR)/c; toM = Rom/c;                                          % 式 8.41, 8.42
Rt = tT - toM(end);                                                    % 时延
```

`refractivity.m` 固定 M=10 层,便于工程估算;`refraction.m` 用 ceil(hmax) 层,精度更高。`Fig8_7.m` 用 refraction.m 给出 1°/2°/5°/10° 四条距离误差曲线。

### 3.10 雨/雪衰减

`Fig8_36.m` 用工程近似 `Att = α·f^β·r`(α=0.0002, β=2.25, f 单位 GHz, r 单位 mm/hr);
`Fig8_37.m` 用 `Att = 0.0035·r²/λ⁴ + 0.0022·r/λ` 拟合雪衰减(吸收+散射两项);
`Fig8_38.m` 实现 22.2 GHz 谐振点上下的分段表达,展示水汽在 22.2 GHz 和 183 GHz 的谐振峰。

---

## 四、代码串联叙述

把 25 个文件按"几何 → 反射 → 绕射 → 衰减"四个主题串成完整流程:

### 主题一:几何( geometry )

`refraction.m` / `refractivity.m` 是雷达波传播的"几何基础"。它们把对流层与电离层切成若干层,在每层应用 Snell 定律,得到**视在距离、距离误差、传播时延**。`Fig8_7.m` 是它们的代表性图示:仰角越低、距离越远,折射误差越大(可达数百米),这是高精度测距雷达必须修正的项。

### 主题二:反射( multipath / specular )

当目标在视距内时,地/海面反射与直射波相干叠加。计算流程是:

```
ref_coef(ψ, ε)         → Fresnel 复反射系数
surf_rough(hrms, ψ)    → 粗糙度衰减 Sr
divergence(r1, r2, ψ)  → 发散因子 D
ρ = |rv|·D·Sr           → 等效反射系数
ΔR = R1 + R2 - Rd       → 路径差(球面三角)
F = √(1+ρ²+2ρ·cos(2πΔR/λ+∠rv))  → 多径传播因子
```

`multipath.m` 是这一主题的"集成脚本",把 4 个子函数串起来。`Fig8_11_12.m`、`Fig8_13_14.m`、`Fig8_17.m` 给出反射系数与粗糙度衰减的曲线族,作为子函数的可视化验证。

### 主题三:绕射( diffraction )

当目标在视距外,主反射不再存在,只剩沿曲面的绕射。`diffraction.m` 调用 `airyzo1.m` 提供的 Airy 函数零点,做谱展开:

```
airyzo1(nt=1500)        → Airy 零点 {a_n}
diffraction(f, hr, ht, R)  → 单程传播因子 F
F² = |F|²(dB)            → 相对自由空间的功率增益
```

`Fig8_28.m`(167 MHz)、`Fig8_29.m`(428 MHz)、`Fig8_30.m`(中间+绕射组合)是三个代表性场景。

### 主题四:大气衰减( atmospheric attenuation )

`atmo_absorp.m` 给按高度的吸收率,`absorption_range.m` 加入仰角几何,`atmospheric_attn.m` 沿距离积分:

```
atmo_absorp(h, Wvd, f)            → γ_O2(h), γ_H2O(h)  [dB/km]
absorption_range(...)             → 加上仰角, 给出 range(h) 与 γ(range)
atmospheric_attn(γ, range)        → 沿距离梯形积分
Attn ≈ 1.9·∫γ dh                 → 双程衰减
```

`Fig8_31.m`、`Fig8_33.m`、`Fig8_34_35.m` 分别按高度、距离、仰角给出衰减分布;`Fig8_36.m`、`Fig8_37.m`、`Fig8_38.m` 覆盖雨/雪/水汽谐振。

### 主题间的关系:完整传播损耗 = 几何修正 + 多径/绕射 + 大气衰减

`Fig8_30.m` 是这一思想的范例图:把中间区(多径)和绕射区(Airy 级数)的传播因子画在同一张图上,展示 75~350 km 全距离的连续覆盖。**任何雷达威力图分析,实质上都是把以上四个主题的损耗叠加到雷达方程上。**

---

## 五、关键公式汇总

### 5.1 大气折射(8.3 节)

对流层折射率:
$$
N_{tropo}(h) = N_0 \exp(-C_e h), \quad n = 1 + 10^{-6}N
$$

电离层电子密度(Chapman):
$$
p_e = p_{max}\exp\left[\tfrac{1}{2}(1-z-e^{-z})\right], \quad z = (h-h_m)/H
$$

折射率:
$$
n_{iono} = 1 - \frac{40.3\,p_e}{f^2}
$$

### 5.2 距离误差与时延(8.3 节)

分层 Snell(式 8.31):
$$
\cos B_m(k) = \cos B_m(k-1) \cdot \frac{n_{k-1} r_{k-1}}{n_k r_k}
$$

距离误差(式 8.43, 8.47):
$$
\Delta R = \sum_k n_k R_{k} - R_{om}
$$

### 5.3 Fresnel 反射系数(8.5 节)

垂直极化(式 8.62):
$$
\rho_v = \frac{\varepsilon \sin\psi - \sqrt{\varepsilon-\cos^2\psi}}{\varepsilon \sin\psi + \sqrt{\varepsilon-\cos^2\psi}}
$$

水平极化(式 8.63):
$$
\rho_h = \frac{\sin\psi - \sqrt{\varepsilon-\cos^2\psi}}{\sin\psi + \sqrt{\varepsilon-\cos^2\psi}}
$$

### 5.4 表面粗糙度与发散(8.5 节)

粗糙度衰减(Ament):
$$
S_r = \exp(-2g), \quad g = \left(\frac{2\pi h_{rms}\sin\psi}{\lambda}\right)^2
$$

球面发散因子:
$$
D = \sqrt{\frac{r_e r \sin\psi\cos\psi}{\left[\frac{2r_1 r_2}{\cos\psi}+r_e r\sin\psi\right](1+h_r/r_e)^2}}
$$

### 5.5 多径传播因子(8.5 节)

$$
\rho = |\rho_v| \cdot D \cdot S_r
$$
$$
F = \sqrt{1+\rho^2+2\rho\cos(\Delta\phi + \angle\rho_v)}, \quad \Delta\phi = \frac{2\pi\Delta R}{\lambda}
$$
$$
F_{dB} = 40\log_{10}(F\cdot R_o/R_d)
$$

### 5.6 绕射区(8.6 节,Shatz 算法)

归一化尺度:
$$
h_0 = \tfrac{1}{2}(r_e\lambda^2/\pi^2)^{1/3}, \quad r_0 = (r_e^2\lambda/\pi)^{1/3}
$$
$$
y = h_r/h_0, \quad z = h_t/h_0, \quad x = R/r_0
$$

传播因子(式 8.96):
$$
F = 2\sqrt{\pi x}\sum_{n=1}^{N}\frac{A_i(a_n+y\varphi)A_i(a_n+z\varphi)\exp\left[\tfrac{2}{3}(a_n+y\varphi)^{3/2}+\tfrac{2}{3}(a_n+z\varphi)^{3/2}\right]e^{(\sqrt{3}/2+j/2)a_n x}}{\varphi^2 A_i'(a_n)^2}
$$

### 5.7 大气吸收(8.7 节)

氧气(式 8.115):
$$
\gamma_{O_2} = \frac{v_1\cdot 0.4909 P^2}{T^{5/2}} \cdot \frac{1}{1+Q\lambda^2}\left(1+\frac{1.39}{\lambda^2}\right)
$$

水汽(式 8.117):
$$
\gamma_{H_2O} = P_h\left[\frac{1}{Q_1+Q\lambda^2}+\frac{1}{Q_2+Q\lambda^2}+\frac{3.43}{\lambda^2}\right]
$$

总吸收沿距离积分:
$$
Attn(r) \approx 1.9\int_0^r [\gamma_{O_2}(s)+\gamma_{H_2O}(s)]\,ds
$$

### 5.8 雨/雪衰减(8.7 节)

雨:$$\gamma_{rain} = \alpha f^\beta r, \quad \alpha=0.0002,\ \beta=2.25$$
雪:$$\gamma_{snow} = \frac{0.0035 r^2}{\lambda^4} + \frac{0.0022 r}{\lambda}$$

---

## 六、章节总结

1. **几何与折射**:`refraction.m`、`refractivity.m` 用分层 Snell 把大气折射量化为距离误差和时延。低仰角、低频(低于电离层临界频率)误差更大,需在测距时修正。

2. **多径干涉**:`multipath.m` 是本章最复杂的程序,综合 `ref_coef`、`surf_rough`、`divergence` 三个辅助函数,把直射波与反射波合成为传播因子 F。低空雷达的"快衰落"现象由此产生,工程上常用分集/对消来对抗。

3. **绕射传播**:`diffraction.m` + `airyzo1.m` 是 Shatz-Polychronopoulos 算法的实现,提供超视距雷达的覆盖预测。频率越高、目标越低,绕射损耗越大。

4. **大气衰减**:`atmo_absorp.m` + `absorption_range.m` + `atmospheric_attn.m` 构成对流层衰减计算链。氧气的谐振峰在 60 GHz 附近,水汽在 22.2 / 183 GHz。低于 10 GHz 时大气衰减通常 < 0.01 dB/km,可忽略。

5. **雨雪衰减**:`Fig8_36.m`、`Fig8_37.m` 提供工程估算公式,频率越高、雨雪越强,衰减越严重(10 GHz 在 100 mm/hr 雨量下可达 1 dB/km 量级)。

6. **工程集成**:`Fig8_30.m` 是范例,把中间区多径与绕射区合成一条完整曲线;**任何雷达威力图分析本质都是把以上四类损耗叠加到雷达方程**( Chap 9 的 `clutter_rcs.m` 已经把这种思想推广到杂波)。
