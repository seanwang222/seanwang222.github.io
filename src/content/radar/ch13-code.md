---
title: "起伏目标检测 · 代码实践"
titleEn: ""
summary: "Chap 12 的 Marcum Q 假设目标 RCS 恒定,实际目标的雷达截面会随姿态、角闪烁、气象条件等因素起伏。Swerling 在 1950 年代提出 5 种统计模型( Swerling 1~5 )描述这种起伏。本章把它们与虚警概率…"
part: "Part IV"
chapter: 13
chapterTitle: "起伏目标检测"
chapterTitleEn: "Detection of Fluctuating Targets"
section: "0"
kind: "code"
order: 13999
tags: ["雷达系统", "第13章", "代码实践"]
source: "《雷达系统分析与设计（MATLAB版）》第 3 版 · 第 13 章代码"
---

---

## 一、章节概述

Chap 12 的 Marcum Q 假设目标 RCS 恒定,实际目标的雷达截面会随**姿态、角闪烁、气象条件**等因素起伏。Swerling 在 1950 年代提出 5 种统计模型( Swerling 1~5 )描述这种起伏。本章把它们与虚警概率、非相干积累结合,给出"实际目标"的检测性能。

**学习目标**
- 掌握 Swerling 1~5 的统计本质(扫描间/扫描内、指数/chi-sq 分布);
- 理解检测概率 Pd 在 Swerling 模型下的解析公式与 Gram-Charlier 渐近;
- 学会使用 `fluct.m` / `fluct_loss.m` 计算起伏损失;
- 掌握非相干积累改善因子与积累损失的关系。

---

## 二、代码清单表格

### 2.1 Swerling 模型核心函数(7 个)

| # | 文件名 | 类型 | 目标模型 | 关键公式 |
|---|--------|------|---------|----------|
| 1 | `pd_swerling1.m` | 函数 | Swerling 1:扫描间独立,指数分布 | `Pd = exp(-V_T/(1+SNR))` (np=1) |
| 2 | `pd_swerling2.m` | 函数 | Swerling 2:扫描内独立,指数分布 | `Pd = 1 - gammainc(V_T/(1+SNR), np)` (np≤50) |
| 3 | `pd_swerling3.m` | 函数 | Swerling 3:扫描间独立,4-自由度 chi-sq | 复杂多项式(见代码) |
| 4 | `pd_swerling4.m` | 函数 | Swerling 4:扫描内独立,4-自由度 chi-sq | 级数展开(见代码) |
| 5 | `pd_swerling5.m` | 函数 | Swerling 5/0:非起伏(对照) | Gram-Charlier 渐近 |

### 2.2 工程计算工具(2 个)

| # | 文件名 | 类型 | 功能 |
|---|--------|------|------|
| 6 | `fluct.m` | 函数 | 给定 Pd/Pfa/np/Swerling 案例,反求所需 SNR(dB) |
| 7 | `fluct_loss.m` | 函数 | 计算起伏损失 `Lf = SNR_SwX - SNR_Sw5`(dB) |

### 2.3 图示曲线(10 个)

| # | 文件名 | 曲线内容 |
|---|--------|----------|
| 8 | `Fig13_2.m` | 改善因子 I(np) 与积累损失 L(np) 随 np 变化( 4 种 (Pfa,Pd) 组合) |
| 9 | `Fig13_4.m` | 检测门限 Vt 随 np 变化( 3 种 nfa ) |
| 10 | `Fig13_5.m` | 非起伏目标:np=1 vs np=10 检测概率对比 |
| 11 | `Fig13_6.m` | Swerling 0 vs Swerling I(np=1) |
| 12 | `Fig13_7.m` | Swerling I vs Swerling 0(15 脉冲积累) |
| 13 | `Fig13_8.m` | Swerling 0/I/II 5 脉冲积累 |
| 14 | `Fig13_9.m` | Swerling 0/I/II 2 脉冲积累 |
| 15 | `Fig13_10.m` | Swerling III,不同 np(1/10/50/100) |
| 16 | `Fig13_11.m` | Swerling 0/I/II/III 5 脉冲积累 |
| 17 | `Fig13_12.m` | Swerling IV,不同 np(5/10/25/75) |
| 18 | `Fig13_13.m` | 起伏损失 Lf 随 Pd 变化( Swerling I/II vs III/IV ) |
| 19 | `Fig13A_1.m` | 不完全 Gamma 函数曲线(工具) |

---

## 三、核心代码详解

### 3.1 `pd_swerling1.m` —— Swerling I 检测概率

**Swerling I 模型**:目标 RCS 服从**指数分布**(每个扫描间独立,N 个脉冲内 RCS 不变)。

**单脉冲**:
$$
P_d = \exp\left(-\frac{V_T}{1+SNR}\right)
$$

**多脉冲( np > 1 )**:
$$
P_d = 1 - I_{V_T}(np-1) + \left(1+\frac{1}{np\cdot SNR}\right)^{np-1} I_{V_T/(1+1/(np\cdot SNR))}(np-1) \cdot e^{-V_T/(1+np\cdot SNR)}
$$

```matlab
function pd = pd_swerling1(nfa, np, snrbar)
    snrbar = 10^(snrbar/10);
    % Newton 迭代求门限 Vt
    pfa = np*log(2)/nfa;
    sqrtpfa = sqrt(-log10(pfa));
    sqrtnp  = sqrt(np);
    vt0 = np - sqrtnp + 2.3*sqrtpfa*(sqrtpfa + sqrtnp - 1);
    while (delta < vt0/10000)
        igf = gammainc(vt0, np);
        num = 0.5^(np/nfa) - igf;
        deno = -exp(-vt0)*vt0^(np-1)/factorial(np-1);
        vt = vt0 - num/(deno+eps);
        delta = abs(vt - vt0);
        vt0 = vt;
    end
    if (np == 1)
        temp = -vt / (1 + snrbar);
        pd = exp(temp);
    else
        temp1 = 1 + np*snrbar;
        temp2 = 1/(np*snrbar);
        val1 = (1 + temp2)^(np-1);
        igf1 = gammainc(vt, np-1);
        igf2 = gammainc(vt/temp1, np-1);
        pd = 1 - igf1 + val1*igf2*exp(-vt/temp1);
    end
end
```

**关键**:所有 pd_swerlingX.m 都先 Newton 迭代求**门限 Vt**,再代入各自的 Pd 公式。Vt 由 Pfa、np 决定,与 SNR 无关。

### 3.2 `pd_swerling2.m` —— Swerling II 检测概率

**Swerling II 模型**:目标 RCS 服从**指数分布,但脉冲间独立**(扫描内独立)。

**np ≤ 50**:
$$
P_d = 1 - I_{V_T/(1+SNR)}(np)
$$

**np > 50**( Gram-Charlier 渐近 ):
$$
V = \frac{V_T - np(1+SNR)}{\sqrt{np}(1+SNR)}
$$
$$
P_d = 0.5\,\text{erfc}\left(\frac{V}{\sqrt{2}}\right) - \phi(V)\left[c_3(V^2-1) + c_4 V(3-V^2) - c_6 V(V^4-10V^2+15)\right]
$$

```matlab
if (np <= 50)
    temp = vt / (1 + snrbar);
    pd = 1 - gammainc(temp, np);
else
    temp1 = snrbar + 1;
    omegabar = sqrt(np)*temp1;
    c3 = -1/sqrt(9*np);
    c4 = 0.25/np;
    c6 = c3^2/2;
    V = (vt - np*temp1)/omegabar;
    q = 0.5*erfc(V/sqrt(2));
    pd = q - val1*val2;     % val2 是 Gram-Charlier 修正项
end
```

### 3.3 `pd_swerling3.m` —— Swerling III 检测概率

**Swerling III 模型**:目标 RCS 服从 **4-自由度 chi-sq 分布**,扫描间独立。

**关键中间量**:
$$
t_1 = \frac{V_T}{1+0.5\cdot np\cdot SNR}, \quad t_2 = 1+\frac{2}{np\cdot SNR}, \quad t_3 = \frac{2(np-2)}{np\cdot SNR}
$$

**np ≤ 2**:
$$
P_d = e^{-t_1} t_2^{np-2}(1 + t_1 - t_3)
$$

**np > 2**:
$$
P_d = \frac{V_T^{np-1}e^{-V_T}}{t_1(np-2)!} + 1 - I_{V_T}(np-1) + k_0 \cdot I_{V_T/(1+2/(np\cdot SNR))}(np-1)
$$

其中 $k_0 = e^{-t_1} t_2^{np-2}(1+t_1-t_3)$。

```matlab
temp1 = vt / (1 + 0.5*np*snrbar);
temp2 = 1 + 2/(np*snrbar);
temp3 = 2*(np-2)/(np*snrbar);
ko = exp(-temp1) * temp2^(np-2) * (1 + temp1 - temp3);
if (np <= 2)
    pd = ko;
else
    temp4 = vt^(np-1)*exp(-vt) / (temp1*factorial(np-2));
    temp5 = vt / (1 + 2/(np*snrbar));
    pd = temp4 + 1 - gammainc(vt, np-1) + ko*gammainc(temp5, np-1);
end
```

### 3.4 `pd_swerling4.m` —— Swerling IV 检测概率

**Swerling IV 模型**:目标 RCS 服从 **4-自由度 chi-sq 分布**,脉冲间独立。

**关键中间量**:`h_8 = SNR/2`, `β = 1+h_8`, `β² = 2β²-1`, `β³ = 2β³`

**np ≥ 50**:
$$
V = \frac{V_T - np(1+SNR)}{\sqrt{np(2\beta-1)}}
$$
$$
P_d = 0.5\,\text{erfc}(V/\sqrt{2}) - \phi(V)[c_3(V^2-1) + c_4 V(3-V^2) - c_6 V(V^4-10V^2+15)]
$$

**np < 50**:级数展开,代码较复杂(略)。

### 3.5 `pd_swerling5.m` —— Swerling V/0(非起伏)

**Swerling V/0**:非起伏目标,作为 Swerling 1~4 的对照基准。

**Gram-Charlier 渐近**( np > 1 ):
$$
t_1 = 2\cdot SNR + 1
$$
$$
V = \frac{V_T - np(1+SNR)}{\sqrt{np \cdot t_1}}
$$
$$
P_d = 0.5\,\text{erfc}(V/\sqrt{2}) - \phi(V)[c_3(V^2-1) + c_4 V(3-V^2) - c_6 V(V^4-10V^2+15)]
$$

```matlab
if (np == 1)
    'Stop, np must be greater than 1'   % np=1 时建议用 marcumsq
    return
end
% Newton 迭代 Vt
% ...
% Gram-Charlier 计算
temp1 = 2*snrbar + 1;
omegabar = sqrt(np*temp1);
c3 = -(snrbar + 1/3)/(sqrt(np)*temp1^1.5);
c4 = (snrbar + 0.25)/(np*temp1^2);
c6 = c3^2/2;
V = (vt - np*(1+snrbar))/omegabar;
q = 0.5*erfc(V/sqrt(2));
pd = q - val1*val2;
```

### 3.6 `fluct.m` —— 反求 SNR

`fluct.m` 用"逐步搜索 + 反复调用 pd_swerlingX.m"的方式,反求达到指定 Pd 所需的最小 SNR:

```matlab
function SNR = fluct(pd, nfa, np, sw_case)
    pfa = np*log(2)/nfa;
    if (sw_case == 0)  % Swerling 5
        if (np == 1)
            b = sqrt(-2*log(pfa));
            Pd_Sw5 = 0.001;
            snr_inc = 0.1 - 0.005;
            while (Pd_Sw5 <= pd)
                snr_inc = snr_inc + 0.005;
                a = sqrt(2*10^(0.1*snr_inc));
                Pd_Sw5 = marcumsq(a, b);
            end
            SNR = snr_inc;
        else
            snr_inc = 0.1 - 0.001;
            Pd_Sw5 = 0.001;
            while (Pd_Sw5 <= pd)
                snr_inc = snr_inc + 0.001;
                Pd_Sw5 = pd_swerling5(pfa, 1, np, snr_inc);
            end
            SNR = snr_inc;
        end
    elseif (sw_case == 1)  % Swerling 1
        snr_inc = 0.1 - 0.001;
        while (Pd_Sw1 <= pd)
            snr_inc = snr_inc + 0.001;
            Pd_Sw1 = pd_swerling1(nfa, np, snr_inc);
        end
        SNR = snr_inc;
    end
    % sw_case 2, 3, 4 类似
end
```

**用法**:
```matlab
SNR_dB = fluct(0.9, 1e6, 10, 1);  % Pd=0.9, nfa=1e6, np=10, Swerling 1
```

**搜索策略**:SNR 从 0.1 dB 开始,以 0.001 dB 步长递增,直到 `Pd ≥ 期望值`。精度 ~0.001 dB。

### 3.7 `fluct_loss.m` —— 起伏损失

$$
L_f = SNR_{SwX} - SNR_{Sw5}, \quad X = 1, 2, 3, 4
$$

**正 Lf** 表示 Swerling X 比非起伏需要更多 SNR(损失);**负 Lf** 表示有 SNR 增益(在某些 Swerling 模型下出现)。

```matlab
function [Lf, Pd_Sw5] = fluct_loss(pd, pfa, np, sw_case)
    % 先求 Sw5 的 SNR_SW5
    % 再求 SwX 的 SNR_SWX
    Lf = SNR_SWX - SNR_SW5;
end
```

### 3.8 图示曲线(`Fig13_*.m`)

`Fig13_2.m` 绘制**改善因子与积累损失**:

```matlab
Pfa = [1e-2, 1e-6, 1e-8, 1e-10];
Pd = [.5 .8 .95 .99];
np = linspace(1, 1000, 10000);
I(1,:) = improv_fac(np, Pfa(1), Pd(1));   % 调用 improv_fac
% ...
L(1,:) = 10*log10(np) - I(1,:);          % 积累损失
```

**注意**:`improv_fac.m` 和 `threshold.m` 是工具箱函数,通常位于 `tool/` 目录,不在本 CodeCollection 中。它们分别计算非相干积累改善因子和检测门限。

`Fig13_5.m` 比较 Swerling 0/5 在 np=1 与 np=10:
```matlab
pfa = 1e-9;
nfa = log(2)/pfa;
b = sqrt(-2*log(pfa));
for snr = 0:.1:20
    a = sqrt(2*10^(0.1*snr));
    pro(index)     = marcumsq(a, b);            % np=1
    prob205(index) = pd_swerling5(pfa, 1, 10, snr);  % np=10
end
plot(x, pro, 'k', x, prob205, 'k:');
```

`Fig13_6.m` 比较 Swerling 0 与 Swerling I(np=1):
- Swerling 0:`Pd = Q_M(√(2·SNR), √(-2·ln(Pfa)))`
- Swerling I:`Pd = exp(-V_T/(1+SNR))`

`Fig13_7.m` ~ `Fig13_12.m` 类似,系统比较各 Swerling 模型在不同 np 下的 Pd-SNR 曲线。

`Fig13_13.m` 绘制**起伏损失 Lf 随 Pd 的变化**:
```matlab
for pd = 0.01:.05:1
    [Lf, Pd_Sw5] = fluct_loss(pd, 1e-7, 1, 1);   % Swerling 1
    Lf1(index) = Lf;
    [Lf, Pd_Sw5] = fluct_loss(pd, 1e-7, 1, 4);   % Swerling 4
    Lf4(index) = Lf;
end
plot(pd, Lf1, 'k', pd, Lf4, 'k:');
```

**结论**:Swerling 1/2 与 Swerling 3/4 损失不同,典型损失 2~10 dB。

`Fig13A_1.m` 工具图:不完全 Gamma 函数 `gammainc(x, q)` 随 x 变化,4 条曲线对应 q=1/3/5/8。

---

## 四、代码串联叙述

### 4.1 Swerling 模型的统计本质

| 模型 | 概率密度 | 自由度 | 起伏速度 |
|------|---------|--------|----------|
| Swerling 1 | 指数 | 2 | 扫描间(慢) |
| Swerling 2 | 指数 | 2 | 扫描内(快) |
| Swerling 3 | chi-sq | 4 | 扫描间(慢) |
| Swerling 4 | chi-sq | 4 | 扫描内(快) |
| Swerling 5/0 | 恒定 | — | 不起伏 |

**Swerling 1 vs 2**:相同统计分布,但起伏相关时间不同(扫描间 vs 脉冲间),导致非相干积累效率不同(Swerling 1 积累增益更大,RCS 在积累期间不变)。

**Swerling 1 vs 3**:指数 vs chi-sq;chi-sq(4 自由度)更"集中",起伏损失更小。

### 4.2 主线:从统计模型到检测性能

```
pd_swerlingX.m  [统计模型 + 非相干积累]
    │
    ▼
fluct.m         [反求 SNR(dB)]
    │
    ▼
fluct_loss.m    [计算起伏损失 Lf]
    │
    ▼
Fig13_*.m       [图示: Pd-SNR / Lf-Pd 曲线族]
```

### 4.3 工程结论

- **Swerling 1 损失最大**(典型 Pd=0.9, Pfa=10^{-6} 时,比非起伏多需 ~8 dB);
- **Swerling 3 损失最小**(典型 ~3 dB);
- **Swerling 2 与 Swerling 4** 在 np 较小时损失接近 Swerling 1/3,np 大时 Swerling 1 反而占优(扫描间独立,积累效率高);
- 实际雷达设计通常假设 Swerling 1(保守),并在功率预算中预留足够余量。

### 4.4 与前几章的衔接

- **Chap 12** 给单脉冲、非起伏的 Marcum Q 解;
- **Chap 13** 加入目标起伏(Swerling 1~4),并加入非相干积累 `np`;
- **Chap 11** 给随机变量/过程基础(Swerling 模型的理论基础);
- **Chap 9/10** 给的杂波与 MTI 改善因子可视为"目标可见性"的预处理步骤;
- **Chap 14 起** 进入雷达截面(RCS)与目标散射细节,是 Swerling 模型的物理来源。

---

## 五、关键公式汇总

### 5.1 Swerling 1(13.3 节)

单脉冲:
$$
P_d = e^{-V_T/(1+SNR)}
$$

多脉冲:
$$
P_d = 1 - I_{V_T}(np-1) + \left(1+\frac{1}{np\cdot SNR}\right)^{np-1} I_{V_T/(1+1/(np\cdot SNR))}(np-1) \cdot e^{-V_T/(1+np\cdot SNR)}
$$

### 5.2 Swerling 2(13.4 节)

np ≤ 50:
$$
P_d = 1 - I_{V_T/(1+SNR)}(np)
$$

np > 50( Gram-Charlier ):
$$
V = \frac{V_T - np(1+SNR)}{\sqrt{np}(1+SNR)}
$$
$$
P_d = 0.5\,\text{erfc}(V/\sqrt{2}) - \phi(V)[c_3(V^2-1) + c_4 V(3-V^2) - c_6 V(V^4-10V^2+15)]
$$

### 5.3 Swerling 3(13.5 节)

np ≤ 2:
$$
P_d = e^{-t_1} t_2^{np-2}(1 + t_1 - t_3)
$$

np > 2:
$$
P_d = \frac{V_T^{np-1}e^{-V_T}}{t_1(np-2)!} + 1 - I_{V_T}(np-1) + k_0 I_{V_T/(1+2/(np\cdot SNR))}(np-1)
$$

其中 $t_1 = V_T/(1+0.5\,np\,SNR)$, $t_2 = 1+2/(np\,SNR)$, $t_3 = 2(np-2)/(np\,SNR)$, $k_0 = e^{-t_1} t_2^{np-2}(1+t_1-t_3)$。

### 5.4 Swerling 4(13.6 节)

np ≥ 50( Gram-Charlier ):
$$
V = \frac{V_T - np(1+SNR)}{\sqrt{np(2\beta-1)}}, \quad \beta = 1 + SNR/2
$$

### 5.5 Swerling 5/0(13.7 节)

$$
V = \frac{V_T - np(1+SNR)}{\sqrt{np(2\cdot SNR + 1)}}
$$
$$
P_d = 0.5\,\text{erfc}(V/\sqrt{2}) - \phi(V)[c_3(V^2-1) + c_4 V(3-V^2) - c_6 V(V^4-10V^2+15)]
$$

### 5.6 门限 Vt( Newton 迭代,所有 Swerling 共用 )

初值:
$$
V_T^{(0)} = np - \sqrt{np} + 2.3\sqrt{-\log_{10} P_{fa}}\left(\sqrt{-\log_{10} P_{fa}} + \sqrt{np} - 1\right)
$$

迭代:
$$
V_T^{(k+1)} = V_T^{(k)} - \frac{0.5^{np/nfa} - I_{V_T^{(k)}}(np)}{-e^{-V_T^{(k)}} V_T^{(k)\,np-1}/(np-1)!}
$$

收敛条件:$|(V_T - V_T^{(0)})/V_T| < 10^{-4}$。

### 5.7 起伏损失(13.10 节)

$$
L_f = SNR_{SwX} - SNR_{Sw5}, \quad X = 1,2,3,4
$$

典型值( Pd=0.9, Pfa=10^{-6}, np=1 ):
- Swerling 1: ~8 dB
- Swerling 2: ~8 dB
- Swerling 3: ~3.5 dB
- Swerling 4: ~3.5 dB

### 5.8 非相干积累改善因子(13.2 节)

理想:`I_i = np`,即 `10·log10(np)` dB;
实际:`I(np) = improv_fac(np, Pfa, Pd)`,典型比理想低 1~3 dB(积累损失);
积累损失:`L = 10·log10(np) - I(np)`。

---

## 六、章节总结

1. **Swerling 1~4 是工程上"目标起伏"的四个代表模型**:扫描间/扫描内 × 指数/chi-sq 分布。Swerling 5/0(非起伏)是基准对照。`pd_swerling1~5.m` 给出每种模型的解析 Pd 公式。

2. **Newton 迭代求门限是所有 pd_swerlingX.m 的共同前置步骤**:Vt 由 Pfa、np 决定,与 SNR 无关。收敛后,不同 Swerling 模型的差异主要体现在"信号项"上(指数 vs chi-sq)。

3. **`fluct.m` 与 `fluct_loss.m` 是工程工具**:前者反求 SNR,后者求起伏损失。它们是 pd_swerlingX.m 的"反函数",把分析能力转化为设计能力。

4. **非相干积累改善因子 `I(np) < 10·log10(np)`**:Chap 13 的 `Fig13_2.m` 用 `improv_fac.m` 给出实际改善因子,典型积累损失 1~3 dB。损失随 np 增大而增大(Pfa 越严,损失越严重)。

5. **Swerling 1 是最常用的工程保守假设**:典型损失 8 dB。Swerling 3/4 损失较小(3~4 dB),适合作为"乐观"假设。Swerling 2/4(快起伏)在 np 大时反而比 Swerling 1/3 差(积累效率低)。

6. **与 Chap 12 衔接**:Chap 12 的 Marcum Q 对应 Swerling 5/0( np=1 );Chap 13 把 np 推广到任意值,把恒定 RCS 推广到 4 种 Swerling 模型,形成完整的"虚警-检测"性能分析框架。

7. **与 Chap 9/10 衔接**:Chap 9/10 处理杂波( MTI 抑制 );Chap 12/13 处理目标( 检测判决 )。两者结合:`Pd = f(SNR - CNR + I_MTI, 目标Swerling模型, np)`,这是雷达系统设计最核心的方程。
