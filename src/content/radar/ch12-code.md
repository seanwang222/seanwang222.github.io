---
title: "单脉冲检测 · 代码实践"
titleEn: ""
summary: "雷达检测的核心问题是: 在给定虚警概率 Pfa 的约束下,选择检测门限 V T,使目标的检测概率 Pd 最大化。Chap 12 给出单脉冲、非起伏目标下的解析解;Chap 13 把它推广到起伏目标。"
part: "Part IV"
chapter: 12
chapterTitle: "单脉冲检测"
chapterTitleEn: "Single Pulse Detection"
section: "0"
kind: "code"
order: 12999
tags: ["雷达系统", "第12章", "代码实践"]
source: "《雷达系统分析与设计（MATLAB版）》第 3 版 · 第 12 章代码"
---

---

## 一、章节概述

雷达检测的核心问题是:**在给定虚警概率 Pfa 的约束下,选择检测门限 V_T,使目标的检测概率 Pd 最大化**。Chap 12 给出单脉冲、非起伏目标下的解析解;Chap 13 把它推广到起伏目标。

**学习目标**
- 理解平方律检波下高斯噪声的虚警概率公式 `Pfa = exp(-V_T²/2σ²)`;
- 掌握 Marcum Q 函数( `Q_M(a,b)` )在检测概率计算中的作用;
- 学会绘制检测概率曲线( Pd vs SNR ),为雷达系统设计提供性能基准。

---

## 二、代码清单表格

| # | 文件名 | 类型 | 功能简述 | 教材公式/章节号 |
|---|--------|------|----------|---------------|
| 1 | `Fig12_3.m` | 脚本 | 归一化检测门限 `V_T/√(2σ²) vs log(Pfa)` | 式 12.13, 12.3 节 |
| 2 | `Fig12_4.m` | 脚本 | 与 Fig12_3 等价( 归一化门限曲线 ) | 式 12.13 |
| 3 | `Fig12_5.m` | 脚本 | 单脉冲检测概率 Pd vs SNR( Pfa=1e-6~1e-12 ) | 式 12.41-12.43, 12.6 节 |
| 4 | `Fi12_4.m` | 脚本 | 与 Fig12_5 等价( Pd vs SNR 曲线 ) | 式 12.41-12.43 |

**注意**:目录里同时有 `Fig12_4.m` 和 `Fi12_4.m`,前者画归一化门限、后者画 Pd 曲线;虽然都标"Fig 12.4",但实际是不同图示,代码语义不同。

---

## 三、核心代码详解

### 3.1 `Fig12_3.m` / `Fig12_4.m` —— 归一化检测门限

**门限与虚警概率的解析关系**(平方律检波,高斯噪声):

$$
P_{fa} = \exp\left(-\frac{V_T^2}{2\sigma^2}\right)
$$

求反函数:
$$
\frac{V_T}{\sqrt{2\sigma^2}} = \sqrt{-\ln P_{fa}}
$$

```matlab
logpfa = linspace(0.01, 250, 1000);    % log10(Pfa) 横轴
var = 10.^(logpfa / 10);                % 把 log10 换为线性
vtnorm = sqrt(log(var));                % √(ln(1/Pfa)) = 归一化门限

semilogx(logpfa, vtnorm, 'k', 'linewidth', 1.5);
xlabel('log(P_{fa})');
ylabel('V_T / (2σ^2)^{1/2}');
grid
```

**图示解读**:
- 横轴 `log10(Pfa)` 范围 0.01~250(对应 Pfa 从 10^{-0.01} 到 10^{-250});
- 纵轴为归一化门限,值域约 1~25;
- 关系为单调递增:虚警率要求越严( Pfa 越小),门限越高;
- 工程意义:在 Pfa=10^{-6} 时,门限约为 √(ln(10^6)) ≈ 3.7;Pfa=10^{-12} 时,门限 ≈ 5.3;
- 是后续 Pd-SNR 曲线(Fig12_5)的"输入"。

### 3.2 `Fig12_5.m` / `Fi12_4.m` —— 单脉冲检测概率( Pd vs SNR )

**核心公式**:Marcum Q 函数

$$
P_d = Q_M(a, b)
$$

其中:
- $a = \sqrt{2 \cdot 10^{SNR/10}}$ — 信号参数
- $b = \sqrt{-2 \ln P_{fa}}$ — 归一化门限

Marcum Q 函数的级数定义:
$$
Q_M(a,b) = \int_b^\infty x \exp\left(-\frac{x^2+a^2}{2}\right) I_0(ax) \, dx
$$

```matlab
for nfa = 6:2:12
    b = sqrt(-2*log(10^(-nfa)));          % nfa = -log10(Pfa)
    index = 0;
    for snr = 2:.1:18
        index = index + 1;
        a = sqrt(2*10^(0.1*snr));
        pro(index) = marcumsq(a, b);       % 调用 Marcum Q
    end
    x = 2:.1:18;
    plot(x, pro, 'k');
    hold on
end
hold off
xlabel('Single pulse SNR in dB');
ylabel('Probability of detection');
gtext('P_{fa}=10^{-6}');  gtext('P_{fa}=10^{-8}');
gtext('P_{fa}=10^{-10}'); gtext('P_{fa}=10^{-12}');
```

**曲线族解读**:
- 4 条曲线对应 Pfa = 10^{-6}、10^{-8}、10^{-10}、10^{-12};
- 同一 Pfa 下,SNR 越大 Pd 越高;
- 同一 Pd 下,Pfa 要求越严(曲线越靠下),所需 SNR 越大;
- 典型工作点:Pd = 0.9、Pfa = 10^{-6} 时,单脉冲所需 SNR ≈ 13.2 dB;
- **注意**:这是"非起伏目标"情形,起伏目标在 Chap 13 需要更高 SNR( Swerling 1 约 + 2~8 dB 起伏损失)。

### 3.3 关于 `marcumsq.m`

`marcumsq(a, b)` 是工具箱函数(通常位于 `tool/` 目录),实现 Marcum Q 函数的数值计算:
- 当 a=0(无信号)时,Q_M(0,b) = exp(-b²/2) = Pfa;
- 当 a≫b(强信号)时,Q_M(a,b) ≈ 1;
- 工程上用级数展开或递归实现,本教材可能采用 Parl 的算法。

---

## 四、代码串联叙述

### 4.1 完整检测链

```
噪声统计(高斯, σ²)
    │
    ▼
Pfa = exp(-V_T² / 2σ²)            [Fig12_3: 归一化门限]
    │  求反函数: V_T = √(-2σ² ln Pfa)
    ▼
Pd = Q_M(a, b)  =  Q_M(√(2·10^SNR/10), √(-2 ln Pfa))   [Fig12_5]
    │  a 随 SNR 增大
    │  b 随 Pfa 减小
    ▼
雷达系统设计: 给定 Pd, Pfa, 反查所需 SNR (dB)
```

### 4.2 4 个文件的关系

| 文件 | 关系 | 备注 |
|------|------|------|
| `Fig12_3.m` | 门限 vs log(Pfa) | 横轴 log,纵轴归一化门限 |
| `Fig12_4.m` | 与 Fig12_3 等价 | 同曲线,文件名笔误? |
| `Fig12_5.m` | Pd vs SNR(4 曲线) | 横轴 SNR,纵轴 Pd |
| `Fi12_4.m` | 与 Fig12_5 等价 | 同曲线,文件名笔误(应 Fig12_6?) |

可能教材里 `Fig12_4` 在原版指代归一化门限曲线,而本目录 `Fi12_4.m` 误用相同标号,实际对应 Pd 曲线。代码注释中已澄清。

### 4.3 从单脉冲到非相干积累

Chap 12 给出**单脉冲**检测;实际雷达会把多个脉冲积累起来( MTI 后积累、PD 滤波器组积累等),可显著降低所需 SNR:

- 非相干积累 N 个脉冲:**理想改善** 10·log10(N) dB;
- **实际改善**受积累损失限制,典型损失 1~3 dB(详见 Chap 13 `Fig13_2.m`);
- Chap 13 用 Swerling 模型描述起伏目标下的非相干积累性能。

---

## 五、关键公式汇总

### 5.1 高斯噪声下平方律检波(12.3 节)

**虚警概率**:
$$
P_{fa} = \int_{V_T}^\infty \frac{r}{\sigma^2}\exp\left(-\frac{r^2}{2\sigma^2}\right)dr = \exp\left(-\frac{V_T^2}{2\sigma^2}\right)
$$

**归一化门限**:
$$
\frac{V_T}{\sqrt{2\sigma^2}} = \sqrt{-\ln P_{fa}}
$$

### 5.2 检测概率( Marcum Q )(12.6 节)

**有信号**:
$$
P_d = \int_{V_T}^\infty \frac{r}{\sigma^2}\exp\left(-\frac{r^2+a^2}{2\sigma^2}\right)I_0\left(\frac{ar}{\sigma^2}\right)dr = Q_M(a,b)
$$

其中:
- $a = \sqrt{2 \cdot SNR}$(信号参数)
- $b = V_T/\sigma$(归一化门限)
- $I_0(\cdot)$ 为零阶修正 Bessel 函数

### 5.3 Marcum Q 函数性质

- $Q_M(0, b) = e^{-b^2/2}$
- $Q_M(\infty, b) = 1$
- 递推:$Q_M(a,b) = Q_M(a,b) - \left(\frac{b}{a}\right)Q_{M+1}(a,b)$
- 近似(大 SNR):$P_d \approx 1 - \Phi\left(\frac{b-a-0.5/a}{\sqrt{1}}\right)$

### 5.4 Albersheim 近似(工程估算,Chap 12 附录)

$$
SNR_{dB} = -5 \log_{10} n + [6.2 + 4.54/\sqrt{n+0.44}]\log_{10}(A+0.12 - 1.7/n) + 5
$$

其中 $A = \ln(0.62/P_{fa}) \cdot \ln(P_d/(1-P_d))$,n 为脉冲数。**无需调用 Marcum Q**。

---

## 六、章节总结

1. **单脉冲检测的核心是 Marcum Q 函数**:`P_d = Q_M(a, b)`,a 由 SNR 决定,b 由 Pfa 决定。Chap 12 的 4 个文件全部围绕这两个量的曲线绘制。

2. **归一化门限与 log(Pfa) 是单调递增关系**(`Fig12_3`):Pfa 每降 1 个数量级,门限约增 1.5(对数刻度上)。这是雷达灵敏度设计的基础约束。

3. **Pd-SNR 曲线族(Fig12_5)是雷达设计图**:横轴 SNR(dB)、纵轴 Pd,4 条曲线对应 4 种 Pfa。设计流程是"先选 Pd、Pfa,再查所需 SNR,最后反推发射功率/天线增益"。

4. **Chap 12 的非起伏假设**:Marcum Q 假设目标 RCS 恒定( Swerling 0/5 模型),实际目标多有起伏( Swerling 1~4 ),**起伏会显著抬高所需 SNR**( Chap 13 `Fig13_6` 给出 Swerling 1 vs Swerling 0 的差异,典型损失 2~8 dB)。

5. **工程上 Albersheim 近似(式 12.59)可替代 Marcum Q**:不需调用 `marcumsq.m`,直接用初等函数,适合手算与系统设计早期阶段。

6. **Chap 12 → Chap 13 的过渡**:Chap 12 给非起伏、单脉冲;Chap 13 把 Swerling 1~4 引入(目标 RCS 服从指数/chi-sq 分布),并加入非相干积累 `np` 参数,形成完整的"虚警-检测"性能评估体系。
