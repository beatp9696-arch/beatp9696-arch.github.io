# American Express Company (NYSE: AXP): investment analysis

## 1. Information cutoff date

**23 September 2026, Bangkok time.** Financial statements: year ended 31 December 2025 and quarter/six months ended 30 June 2026. Subsequent credit information: August 2026, filed 15 September. Market reference: **USD305.07 at the 22 September 2026, 4:00 p.m. EDT regular-session close**; after-hours trading is excluded. [K25; Q26; M8; PX]

This report is accompanied by a [calculation workbook](./calculation-workbook.md), [historical data/YoY/source ledger](./historical-data.csv), and [reproducible model](./model.py). They are integral parts of the report: the ledger supplies each annual metric, period, unit, exact input, YoY formula, filing date, direct source, and section. The workbook supplies all valuation sensitivities and every annual scenario line item. No quarterly result is silently annualized.

Labeling: **reported** means a company/regulatory disclosure; **calculated** means arithmetic using specified reported inputs; **guidance** means management's forecast; **assumption/scenario** means this analyst's judgment. Qualitative assessments, probabilities, outlooks, and recommendation are interpretations, not reported facts. USD throughout; “m” means millions, “bn” billions; pp means percentage points. Source IDs resolve to the dated, directly linked documents in section 24; sections named in table captions apply to every cell.

The supplied July 24 call transcript is useful context but has not been authenticated word-for-word against an official transcript. Material reported results and headline guidance are independently corroborated. Claims available only in that text are labeled **T, user-supplied transcript** and do not become verified company facts. In particular, the phrase “since 2003” regarding recent international refreshes is not used, and the stressed-loss ranking is not independently asserted. September 16 conference audio was identified but no authenticated transcript was reviewed; July 24 is the latest guidance independently verified here. This is a disclosed coverage limitation, not an assertion that nothing was said subsequently.

## 2. Executive summary

**Conclusion: Watchlist. Excellent franchise; insufficient margin of safety at USD305.07.** My rounded present fair values are **USD154 bear / USD296 base / USD456 bull**, not five-year price targets. Base-case five-year annualized shareholder return is **9.4%**, including modeled dividends; it is conditional, not a probability-weighted expected return or a promise. A **USD235–240** entry range would be more compelling if operating and credit evidence remains intact. The calculation methods, assumptions, and adverse outcomes appear in sections 15–17.

American Express combines a payment network, card issuer, merchant relationships, and balance-sheet lending. It earns merchant discount revenue, annual membership fees, lending spreads, and service/network revenue. Its advantage is the interaction among premium customers, merchant economics, direct customer data, recurring membership fees, and a differentiated rewards/services proposition—not brand alone. [K25, Business and Notes 1/17]

Four principal advantages are its integrated network/data relationship, high-spending fee-paying customer base, durable partner/rewards ecosystem, and ability to reinvest while earning high returns on equity. Four principal risks are unsecured credit cyclicality, rising benefit/rewards costs, premium-card and commercial-payments competition, and regulatory/valuation risk. These judgments are supported and challenged in sections 8–13.

Operating demand is improving: Q2 2026 revenue was **USD19,637m**, versus **USD17,856m**, and billed business **USD455.8bn**, versus **USD416.3bn**. However, pre-provision pretax earnings grew only **4.0%**, calculated as `(19,637−14,482)/(17,856−12,901)−1`; headline pretax growth benefited from lower provisions. Services expense grew **49.8%**, `(1,949/1,301−1)`, versus revenue growth of **10.0%**, `(19,637/17,856−1)`. [Q26, MD&A and income statement]

Credit is healthy and modestly improving on comparable definitions: Q2 combined consumer/small-business 30-plus-day delinquency was **1.2% versus 1.3%**, while principal write-offs were **2.0% in both quarters**. August U.S. consumer delinquency remained **1.1%** and SME delinquency **1.3%**. June recoveries benefited from a sale of previously written-off balances, so June's unusually low monthly write-offs should not be extrapolated. [Q26, Selected Credit Statistics; M8, tables and footnote]

The stock trades at a calculated **18.51× TTM EPS** (`305.07/16.48`) and **17.33× FY2026 guidance midpoint** (`305.07/[(17.30+17.90)/2]`). Base fair value is about **3.0% below** the price (`295.8843/305.07−1`). [K25; Q26; E26; PX; analyst valuation]

Why this conclusion could be wrong: premium fee growth may persist longer than modeled; commercial/international expansion may accelerate; benefits spending may yield better operating leverage; or credit losses and funding costs may rise faster than assumed. The unusually wide valuation range is a reason for price discipline, not evidence of precision.

## 3. Business model

Amex's integrated, often called closed-loop, model connects issuing, cardmember servicing, underwriting, merchant acquiring/network functions, and transaction data. It is not literally a wholly owned loop for every transaction: third-party issuers, acquirers, aggregators, and network partners also participate. Visa and Mastercard primarily sell network and related services to financial institutions and other clients; Amex additionally retains significant card credit and funding exposure. [K25, Business, GMNS and Supervision; V26; MA26]

For a transaction of amount **T**, and a merchant discount **d**—symbols, not assumed actual pricing—the simplified proprietary flow is:

`Cardmember buys T → merchant is settled T−d → Amex records the card balance T → cardmember later pays T, plus applicable interest/fees.`

Amex recognizes the merchant discount as transaction activity occurs, subject to its revenue policies. The card balance principal is an asset, **not revenue**. Some of the economics are shared with acquiring, network, or co-brand partners. Rewards liability/expense is recognized as points are earned using estimated ultimate redemption and redemption cost. Funding interest, losses, servicing, marketing, partner payments, and benefits reduce the economic spread. [K25, Notes 1 and 17, Revenue Recognition and Membership Rewards]

| Participant / activity | What Amex earns or pays | Accounting and economics |
| --- | --- | --- |
| Merchants / acquirers | Discount and network/service fees | Spending-linked revenue; merchant pricing varies by geography, category, channel, and relationship. Not a universal interchange rate. |
| Cardmembers | Annual fees; lending interest; selected other fees | Net card fees recognized over membership periods; interest over time under lending policies. Fee cash collection is not immediate full revenue. |
| Network partners | Network-related fees | Included in service fees/other under the current presentation; economics differ from proprietary cards. |
| Travel and other service customers/partners | Travel commissions, service and other revenue | Recognition depends on the service/performance obligation; not equivalent to gross travel bookings. |
| Cardmembers receiving rewards/benefits | Points, statement credits, lounges, servicing | Rewards and cardmember services expenses; redemption assumptions can alter current earnings on an existing liability. |
| Co-brand and other business partners | Revenue shares and other payments | Business development and contractual economics; a strong partner can demand more of the surplus. |
| Depositors and bondholders | Interest paid by Amex | A cost of supplying lending/settlement liquidity; not simply corporate financing unrelated to operations. |
| Prospective customers | Acquisition incentives and marketing | Investment must earn future spending, fees, interest and retention; disclosed marketing is not a clean new-customer acquisition-cost denominator. |

Source for the entire table: [K25, Business; Notes 1, 11, 12 and 17; Q26, Presentation Changes].

Premium consumers can support spending and annual fees simultaneously; their credit quality can reduce losses, but they are expensive to attract and serve. Commercial customers bring procurement/travel spending and potential software, cash-management and lending relationships; corporate and SME economics differ, and a large corporate account is not interchangeable with a revolving consumer account. Merchant acquisition benefits from customer spending demand, but broad acceptance expansion can dilute the blended discount yield. [K25, Business, segment MD&A and Risk Factors]

Retaining lending exposure captures an additional earnings stream and customer relationship. It also requires deposits/debt, capital, underwriting, collections and reserves. Amex therefore deserves neither a pure-bank valuation automatically nor Visa's multiple without a credit/capital adjustment.

## 4. Business segments

Current segments are **U.S. Consumer Services (USCS), Commercial Services (CS), International Card Services (ICS), and Global Merchant and Network Services (GMNS)**. Corporate & Other and eliminations reconcile to consolidated totals. The earlier reorganization placing international commercial businesses with ICS makes unrecast pre-reorganization comparisons inappropriate; the comparable 2023–2025 series below uses K25 throughout. [K25, Segment MD&A and Note 24; K22, Segment Reporting]

**Reported USDm, years ended December 31; K25, Tables 8/10/12/14 and segment note, filed February 6, 2026.** Ratios in the last three columns are calculated.

| Segment | Revenue 2023 / 2024 / 2025 | Pretax 2023 / 2024 / 2025 | 2025 revenue share | 2025 pretax share | 2025 pretax margin |
| --- | --- | --- | --- | --- | --- |
| USCS | 28,116 / 31,427 / 34,814 | 5,433 / 6,377 / 6,810 | 48.2% | 49.4% | 19.6% |
| CS | 14,776 / 15,859 / 16,926 | 2,861 / 3,505 / 3,668 | 23.4% | 26.6% | 21.7% |
| ICS | 10,430 / 11,461 / 13,000 | 973 / 1,031 / 1,603 | 18.0% | 11.6% | 12.3% |
| GMNS | 7,396 / 7,484 / 7,759 | 3,656 / 4,398 / 3,968 | 10.7% | 28.8% | 51.1% |
| Corporate & Other / eliminations, calculated reconciliation | −203 / −282 / −270 | −2,410 / −2,416 / −2,254 | −0.4% | −16.3% | Not meaningful |
| Consolidated | 60,515 / 65,949 / 72,229 | 10,513 / 12,895 / 13,795 | 100% | 100% | 19.1% |

Formulas for every segment: revenue share=`2025 segment revenue/72,229`; profit share=`2025 segment pretax/13,795`; margin=`segment pretax/segment revenue`. Corporate amounts=`consolidated−sum(four segments)`. Shares can sum above 100% before corporate losses; segment revenues involve allocations and are not four independent external sales streams.

| Segment | Q2 2026 revenue / pretax, USDm (reported) | 2023–25 revenue CAGR (calculated) | Competitive position, risks and analyst 3–5-year outlook |
| --- | --- | --- | --- |
| USCS | 9,524 / 2,065 | `(34,814/28,116)^(1/2)−1` = 11.3% | Strongest premium franchise; fees and spending should support growth. Benefit inflation and affluent-consumer competition are the critical offsets. |
| CS | 4,503 / 970 | `(16,926/14,776)^(1/2)−1` = 7.0% | Established business relationships; software/workflow integration could improve retention. Fintech and co-brand exits constrain growth; outlook positive but less certain than consumer. |
| ICS | 3,619 / 477 | `(13,000/10,430)^(1/2)−1` = 11.6% | Premium/acceptance expansion provides runway; country-specific competition, FX and regulation limit a uniform global template. Potential fastest growth, with lower current margin. |
| GMNS | 2,096 / 1,128 | `(7,759/7,396)^(1/2)−1` = 2.4% | High-margin network economics support the franchise; merchant fee pressure and incentives restrain monetization. 2024 profit included the Accertify sale, making its decline in 2025 an invalid clean operating comparison. |

Quarter source: [Q26, segment MD&A, filed July 24, 2026]. Q2 corporate reconciliation: revenue=`19,637−(9,524+4,503+3,619+2,096)=−105`; pretax=`4,071−(2,065+970+477+1,128)=−569`, USDm. Segment growth forecasts above are qualitative interpretations, not management targets.

## 5. Historical operating data

The CSV and workbook contain **six calendar years, 2020–2025**, with YoY calculations. Below is the five-year core view; dollars and units are explicitly labeled. Sources: [K22, selected statistics/financial statements for 2021–22; K25, Tables 2–7 for 2023–25].

| Reported metric | 2021 | 2022 | 2023 | 2024 | 2025 |
| --- | --- | --- | --- | --- | --- |
| Billed business / proprietary cardmember spending, USDbn | 1,089.8 | 1,338.3 | 1,459.6 | 1,550.9 | 1,669.8 |
| Total network volume, USDbn | 1,284.2 | 1,552.8 | 1,680.1 | 1,764.8 | 1,897.0 |
| Total cards, m | 121.7 | 133.3 | 141.2 | 146.5 | 152.8 |
| Proprietary cards, m | 71.4 | 76.7 | 80.2 | 83.6 | 86.6 |
| Average proprietary basic-card spending, USD/year | 20,392 | 23,496 | 24,059 | 24,608 | 25,453 |
| Discount revenue, USDm | 24,563 | 30,739 | 33,416 | 35,192 | 37,401 |
| Net card fees, USDm | 5,195 | 6,070 | 7,255 | 8,449 | 9,993 |
| Card loans, gross USDm | 88,562 | 107,964 | 125,995 | 139,674 | 151,832 |
| Card receivables, gross USDm | 53,645 | 57,613 | 60,411 | 59,411 | 62,031 |
| Rewards, USDm | 11,007 | 14,002 | 15,367 | 16,599 | 18,409 |
| Cardmember services, USDm | 1,993 | 2,959 | 3,968 | 4,782 | 6,057 |
| Marketing, USDm | 5,291 | 5,458 | 5,213 | 6,040 | 6,252 |

For every positive-valued series, YoY=`(current/prior−1)×100`; exact substitutions are in the CSV, not estimated growth rates. Cardmember spending and billed business are the same proprietary metric here; counting both as separate economic growth drivers would double count. Network volume additionally includes third-party-issued activity. Average spending uses the company's basic-card definition, not total billings divided by all cards. [K25, Glossary and Tables 5–6]

**Critical definition breaks:**

- In 2022, revenue/expense presentation was recast, including separately presented processed revenue and marketing/business-development lines. The ledger uses recast inputs. In 2025, network partnership revenue, previously processed revenue, moved into service fees/other; this is classification, not new economic growth. [K22, Presentation Changes; K25, Note 17]
- The legacy average discount rate was **2.30% in 2021 and 2.34% in 2022**. The newer reported discount-revenue/billed-business measure was **2.29%, 2.27%, 2.24% in 2023–25**. These are different definitions, not a continuous rate series. The missing legacy rate for 2023–25: **Data not found in the reviewed primary sources.** [K22, selected statistics; K25, Table 5]
- Legacy adjusted loan-only net interest yield was **10.7% in 2021 and 10.6% in 2022**. Beginning Q3 2025 Amex replaced it with GAAP NII divided by average all loans and card receivables, including held-for-sale balances; recast 2023–25 values are **7.3%, 7.9%, 8.1%**. The change is not a collapse in lending yield. [K22, statistics; K25, Presentation Changes and Table 1]
- Beginning Q1 2026, card loans and receivables are combined as **Card balances**, reflecting the expansion of revolving features. Recognition/measurement did not change merely because of presentation. Separate Q2 2026 loan and receivable amounts: **Data not found in the reviewed primary sources.** [Q26, Presentation Changes and Note 2]

New proprietary cards acquired: **2022 12.5m, 2023 12.2m, 2024 13.0m, 2025 12.5m; Q2 2026 3.0m versus 3.1m**. Calculated annual changes: 2023=`12.2/12.5−1=−2.4%`; 2024=`13/12.2−1=6.6%`; 2025=`12.5/13−1=−3.8%`; latest quarter=`3/3.1−1=−3.2%`. 2021 verified total: **Data not found in the reviewed primary sources.** Falling acquisition counts do not themselves demonstrate weaker lifetime value, but they challenge a pure customer-count growth story. [E22; K25 Table 5; Q26 selected statistics]

2025 management disclosures: **over 70%** of new accounts were fee-paying; approximately **65%** of new global consumer accounts were Millennials/Gen Z; merchant acceptance exceeded **170m locations**, including an estimated **37m in China** and digital-wallet-enabled access. These are company estimates/definitions, not a census of unique physical stores. A comparable five-year cohort growth or acceptance series, numeric cohort retention, customer acquisition cost and customer lifetime value: **Data not found in the reviewed primary sources.** No undisclosed retention percentage is assumed. [AR25, shareholder letter and coverage footnotes]

Interpretation: spending, fees, cards and NII are improving; merchant monetization per dollar is gently compressing; benefit costs are rising faster than revenue; credit has normalized from pandemic-era lows. The claim “all operating metrics are improving” would be false.

## 6. Financial-statement analysis

**Reported USDm unless stated, fiscal years ended December 31.** Sources [K22, income/cash-flow statements; K25, income/cash-flow statements and Table 1].

| Metric | 2021 | 2022 | 2023 | 2024 | 2025 |
| --- | --- | --- | --- | --- | --- |
| Revenue net of interest expense | 42,380 | 52,862 | 60,515 | 65,949 | 72,229 |
| Non-interest revenue | 34,630 | 42,967 | 47,381 | 50,406 | 54,865 |
| Net interest income | 7,750 | 9,895 | 13,134 | 15,543 | 17,364 |
| Credit provisions | −1,419 | 2,182 | 4,923 | 5,185 | 5,256 |
| Total expenses | 33,110 | 41,095 | 45,079 | 47,869 | 53,178 |
| Pretax income | 10,689 | 9,585 | 10,513 | 12,895 | 13,795 |
| Net income | 8,060 | 7,514 | 8,374 | 10,129 | 10,833 |
| Diluted EPS, USD | 10.02 | 9.85 | 11.21 | 14.01 | 15.38 |
| Diluted average shares, m | 790 | 752 | 736 | 713 | 696 |
| Reported ROE | 33.7% | 32.3% | 31.5% | 34.6% | 33.9% |
| Calculated ROA | 4.25% | 3.66% | 3.45% | 3.78% | 3.71% |
| Calculated common BV/share, USD | 27.06 | 31.13 | 36.62 | 40.85 | 46.49 |
| Calculated tangible common BV/share, USD | 21.80 | 25.83 | 31.15 | 34.72 | 39.25 |
| Operating cash flow | 14,645 | 21,079 | 18,559 | 14,050 | 18,428 |
| Purchases premises/equipment, **net of sales** | 1,550 | 1,855 | 1,563 | 1,911 | 2,425 |
| Dividends declared per common share, USD | 1.72 | 2.08 | 2.40 | 2.80 | 3.28 |
| Cash dividends paid, including preferred | 1,448 | 1,565 | 1,780 | 1,999 | 2,271 |
| Cash-flow repurchases **and other** | 7,652 | 3,502 | 3,650 | 6,020 | 5,814 |

ROA=`net income/reported average total assets`, not ending assets. BV=`(total equity−preferred carrying capital)/ending common shares`; tangible BV further deducts goodwill and amortized intangibles, without a deferred-tax adjustment. Every year's numerator/denominator is displayed in the workbook. Reported ROE uses the company's average-equity convention and is not automatically common-equity ROE. Net capex and “repurchases and other” are deliberately not mislabeled gross capex or pure authorized-program purchases.

**Reported balance-sheet amounts, USDm at December 31, except CET1 %.** Sources [K21; K22; K23; K25, balance sheets and regulatory capital notes].

| Metric | 2021 | 2022 | 2023 | 2024 | 2025 |
| --- | --- | --- | --- | --- | --- |
| Deposits | 84,382 | 110,239 | 129,144 | 139,413 | 152,488 |
| Long-term debt | 38,675 | 42,573 | 47,866 | 49,715 | 56,387 |
| Cash/equivalents | 22,028 | 33,914 | 46,596 | 40,640 | 47,792 |
| Total assets | 188,548 | 228,354 | 261,108 | 271,461 | 300,052 |
| Total equity | 22,177 | 24,711 | 28,057 | 30,264 | 33,474 |
| CET1 ratio | 10.5% | 10.3% | 10.5% | 10.5% | 10.5% |
| CET1 capital, **USDbn**, source precision retained | 17.6 | 20.0 | 23.2 | 24.860 | 27.268 |

June 30, 2026: cash **USD45,243m**, deposits **USD156,973m**, long-term debt **USD57,017m**, assets **USD308,203m**, equity **USD34,280m**, CET1 capital **USD27,779m**, RWA **USD268,321m** and CET1 **10.4%**, versus a **7.0%** effective minimum and management's **10–11%** target. The rounded cushion is `10.4−7.0=3.4pp`; it is not cash available for immediate distribution. Amex also reported an undrawn **USD6bn** committed bank facility and **USD91bn** of Federal Reserve borrowing capacity against collateral—contingent funding capacity, not another USD97bn of cash. [Q26, Capital Management and Liquidity, pp.23–31; balance sheet p.42]

**Calculated TTM to June 30, 2026:** revenue **USD75,950m**=`72,229+38,544−34,823`; net income **USD11,446m**=`10,833+6,082−5,469`; summed diluted EPS **USD16.48**=`15.38+8.81−7.71`; OCF **USD18,475m**=`18,428+9,175−9,128`; net capex **USD3,423m**=`2,425+2,047−1,049`. All remaining TTM flows and quarterly comparisons appear in the workbook. [K25; Q26]

| Calculated CAGR | 3 years: 2022–25 | 5 years: 2020–25 |
| --- | --- | --- |
| Revenue | `(72,229/52,862)^(1/3)−1` = 10.97% | `(72,229/36,087)^(1/5)−1` = 14.89% |
| Net income | `(10,833/7,514)^(1/3)−1` = 12.97% | `(10,833/3,135)^(1/5)−1` = 28.15% |
| Diluted EPS | `(15.38/9.85)^(1/3)−1` = 16.01% | `(15.38/3.77)^(1/5)−1` = 32.47% |
| Common BV/share | `[((33,474−1,584)/686)/((24,711−1,584)/743)]^(1/3)−1` = 14.31% | `[((33,474−1,584)/686)/((22,984−1,584)/805)]^(1/5)−1` = 11.83% |
| Common DPS | `(3.28/2.08)^(1/3)−1` = 16.40% | `(3.28/1.72)^(1/5)−1` = 13.78% |

Pandemic-depressed 2020 mechanically inflates the five-year earnings CAGRs; none is an appropriate unadjusted forward forecast.

Conventional free cash flow is particularly misleading here. `TTM OCF−net capex=18,475−3,423=USD15,052m` is calculable but **not owner-distributable cash**. Customer credit-asset growth is largely investing cash flow, deposits/debt fund those assets, and regulators constrain distributions. A company could show attractive conventional FCF while requiring more common capital. Conversely, growth in quality receivables can consume cash while creating value. Equity earnings, credit costs, capital requirements and distributable capital are more appropriate valuation anchors. [K25; Q26, cash-flow statements and capital discussion]

## 7. Earnings quality

**Assessment: approximately normalized operating franchise, with current credit costs better than a conservative through-cycle assumption.** Q2 earnings are not fully “clean recurring” earnings.

For FY2025, the exact pretax bridge is `6,280 revenue increase −71 additional provisions −5,309 additional expenses = USD900m pretax increase`; `900−196 additional tax = USD704m net-income increase`. Revenues were supported by spending, fees and lending, not just repurchases. But total expense/revenue increased from `47,869/65,949=72.58%` to `53,178/72,229=73.62%`; not all-in operating leverage. [K25, Table 1]

FY2024 EPS included a reported **USD0.66/share Accertify gain**. Comparable EPS is `14.01−0.66=USD13.35`; FY2025 growth against that figure is `15.38/13.35−1=15.2%`, versus GAAP `15.38/14.01−1=9.8%`. This is a disclosed non-GAAP comparison, not a replacement for GAAP. [E24, Appendix I; K25]

For Q2 2026, the pretax bridge is `+1,781 revenue −1,581 expenses +321 lower provision = +USD521m`. Pre-provision profit rose only `5,155/4,955−1=4.0%`. Higher tax expense absorbed **USD296m**, leaving **USD225m** more net income. [Q26, Table 1]

An EPS bridge using the reported rounded share counts is:

- Q2 2025 earnings available for diluted common EPS=`2,885−18 participating awards−15 preferred dividends=USD2,852m`.
- Q2 2026 equivalent=`3,110−20−15=USD3,075m`.
- Earnings contribution at old shares=`(3,075−2,852)/699=USD0.319/share`.
- Share-count contribution=`3,075×(1/679−1/699)=USD0.130/share`.
- Sum **USD0.449/share**, reconciling to reported `4.53−4.08=USD0.45` after rounding. [Q26, Table 1 footnote b and EPS note]

Q2 aggregate net write-offs of `1,207+64+4=USD1,275m` exceeded the **USD1,084m** provision by **USD191m**. Holding tax at the analyst normalized **23.5%** and shares at **679m**, removing that reserve-release benefit alone reduces EPS by `191×(1−0.235)/679=USD0.215`. This is a sensitivity, **not** a complete adjusted EPS measure or management result. It does not also remove the sold-write-off recoveries, which would risk double counting without a dollar reconciliation. [Q26, reserve tables; analyst calculation]

The supplied transcript describes a favorable ultimate-redemption-rate model update. The exact earnings benefit: **Data not found in the reviewed primary sources.** It is therefore not quantified or added back. A pending GBT stake-sale gain is excluded from recurring valuation; no unrecognized gain is treated as existing earnings. [Q26, investments/dispositions; T]

The 2021 **negative USD1,419m provision** demonstrates why the pandemic release year was not normalized. Today's losses are higher than those unusually low levels; that is normalization, not proof that underwriting has broken. [K22, income statement; historical credit table]

## 8. Credit quality

**Reported loan-only metrics, fiscal years ended December 31; [K22; K25, selected credit statistics and reserve notes].**

| Metric | 2021 | 2022 | 2023 | 2024 | 2025 |
| --- | --- | --- | --- | --- | --- |
| Principal-only card-loan write-off rate | 0.9% | 0.9% | 1.8% | 2.2% | 2.2% |
| Including interest/fees | 1.2% | 1.1% | 2.2% | 2.7% | 2.7% |
| Card-loan 30+ delinquency | 0.7% | 1.0% | 1.4% | 1.4% | 1.4% |
| Loan reserve, USDm | 3,305 | 3,747 | 5,118 | 5,679 | 5,909 |
| Loan reserve / loans, reported rounded | 3.7% | 3.5% | 4.1% | 4.1% | 3.9% |
| Receivable reserve, USDm | 64 | 229 | 174 | 171 | 180 |

Dollar past-due amounts can be calculated by summing the disclosed 30–59, 60–89 and 90-plus buckets. **Consumer+SME only**, USDm; corporate receivables use past-billing conventions and are excluded. [K22, Note 2 for 2021–22; K25, Table 2.3 for 2023–25]

| Year | Loan past-due calculation | Receivable past-due calculation |
| --- | --- | --- |
| 2021 | `158+112+237+34+19+37 = 597` | `41+24+48+59+28+44 = 244` |
| 2022 | `281+198+383+81+49+86 = 1,078` | `83+56+112+120+69+110 = 550` |
| 2023 | `420+298+614+133+85+171 = 1,721` | `70+47+106+104+62+100 = 489` |
| 2024 | `437+329+725+151+107+223 = 1,972` | `58+39+79+77+54+88 = 395` |
| 2025 | `473+350+748+173+121+252 = 2,117` | `56+42+103+82+47+88 = 418` |

For June 2026 the comparable combined-card view is more useful: gross **USD218,054m**, reserve **USD5,866m**, reported coverage **2.7%**, Q2 all-in write-offs **2.2%**, principal consumer/SME write-offs **2.0%**, and 30+ delinquency **1.2%**. June 2025 comparatives were **USD201,873m**, **USD5,960m**, **3.0%**, **2.2%**, **2.0%**, and **1.3%**. Do not interpret 2025 loan-only 3.9% coverage versus June combined 2.7% as a like-for-like reserve collapse. [Q26, selected credit statistics]

**Later U.S. monthly data, reported, M8 filed September 15, 2026:**

| Portfolio / metric | June 2026 | July 2026 | August 2026 |
| --- | --- | --- | --- |
| Consumer HFI card balances, USDbn | 113.8 | 113.1 | 114.2 |
| Consumer 30+ delinquency | 1.1% | 1.1% | 1.1% |
| Consumer annualized principal write-offs | 1.4% | 1.7% | 1.7% |
| SME HFI card balances, USDbn | 45.9 | 46.1 | 46.1 |
| SME 30+ delinquency | 1.4% | 1.3% | 1.3% |
| SME annualized principal write-offs | 2.3% | 2.6% | 2.2% |

June's sale of previously written-off balances lowered monthly write-off rates by approximately **0.3pp consumer / 0.1pp SME**, per the filing. July's rebound is therefore not pure underlying deterioration. Monthly rates are company-annualized metrics, not three-month loss forecasts. Trust-only card metrics and worldwide company metrics have different populations. [M8, footnotes]

The Federal Reserve's U.S. commercial-bank credit-card charge-off rate was **3.82% SA annualized in Q2 2026**, versus **4.19% in Q2 2025**. This supports industry normalization, but is not a controlled underwriting comparison with Amex's worldwide mixed charge/revolve portfolio. [FEDC, updated August 25, 2026]

Unsecured exposure remains economically meaningful. Premium does not mean immune to unemployment, recession, business failure, fraud or declining repayment capacity. Faster loan growth can temporarily dilute reported loss rates because new loans have not seasoned. The reviewed notes disclose credit-quality indicators, modifications and some origination-year information, but a complete card-vintage loss curve or acquisition-cohort lifetime loss series: **Data not found in the reviewed primary sources.** This limits causal proof that stronger portfolio mix alone explains current losses. [K25, Notes 2–3; Q26, Notes 2–3]

### Scenario analysis—not a company forecast

Freeze Q2 average Card balances at **USD216,710m** for one year, apply an incremental principal charge-off shock to that whole-balance proxy, assume **23.5% tax**, no offsetting revenue/cost action, and **679m diluted shares**. The proxy includes corporate balances even though the reported principal-only rate does not; the sensitivity is therefore explicitly a modeled exposure shock, not an exact replication of the disclosed principal metric. [Q26 for balances/shares; tax and stress are assumptions]

`Pretax reduction = 216,710 × incremental rate; NI reduction = pretax reduction × 76.5%; EPS reduction = NI reduction / 679.`

| Incremental annual charge-off rate | Pretax reduction, USDm | NI reduction, USDm | EPS reduction, USD/share |
| --- | --- | --- | --- |
| +0.50pp | 1,083.55 | 828.92 | 1.22 |
| +1.00pp | 2,167.10 | 1,657.83 | 2.44 |
| +1.50pp | 3,250.65 | 2,486.75 | 3.66 |

No incremental CECL build is included. A real recession could initially hurt more through reserve builds and lower spending; recoveries, tax limits and management actions could change the outcome.

## 9. Competitive advantages

**Overall moat: Strong, with recurring reinvestment required.** The decisive evidence is monetized fees/spending, credit outcomes, returns and customer relevance, not a claim that every product has high switching costs. The direction column is an analyst judgment. Evidence refers to 2025/Q2 2026 unless otherwise specified. [K25, Business, Risk Factors, Tables 1–7; Q26; AR25]

| Factor | Supporting evidence | Challenge / counterevidence | Direction |
| --- | --- | --- | --- |
| Brand | Premium fee demand; USD9,993m FY2025 fees | Benefits may be doing more work than the logo | Strengthening, conditional |
| Integrated network | Issuer/merchant relationships and transaction data in one organization | Partners mean not every transaction is fully proprietary | Stable strong |
| Network effects | More acceptance improves card utility and merchant reach | Larger competing ecosystems; merchant steering | Improving coverage, pricing pressure |
| Premium customer base | Strong fees, spending and low delinquency | Affluent travel/discretionary spending remains cyclical | Strengthening |
| Spending data | Direct transaction and credit relationships | Privacy limits, competitors' data, selection bias | Stable advantage |
| Membership Rewards | Accrued rewards ecosystem and redemption utility | Increasing usage/cost; assumptions affect earnings | Engagement stronger, cost burden higher |
| Merchant relationships | Spending demand and global acceptance reach | Falling discount revenue/billings | Broader, less monetization per dollar |
| Pricing power/card fees | Fees outgrow total revenue | Customer benefit cost may offset price increases | Positive, not unlimited |
| Retention | Management says retention remains strong | Numeric cohort retention unavailable | Unproven improvement; likely stable |
| Partner relationships | Co-brands, travel/dining benefits | Partners can capture economics or leave | Strong but contested |
| Switching costs | Accrued points, habits, corporate workflows | Consumers can carry multiple cards | Moderate, not absolute |
| Marketing efficiency | Ability to fund acquisition from recurring economics | Fewer new cards in 2025/Q2 2026; CAC/LTV undisclosed | Not proven to improve |
| Risk management | Stable low comparable delinquency | No controlled vintage experiment; reserve release helped | Strong, cycle test remains |
| Scale | USD72,229m 2025 revenue supports investment | Scale increases execution/cyber/control complexity | Strengthening |
| Global premium ecosystem | International segment growth and services | Localization/regulation; higher costs | Strengthening selectively |

The strongest challenge to the moat is not disappearance of the card network. It is that competitors and partners force Amex to give cardmembers an increasing share of gross revenue merely to retain the same wallet share.

## 10. Competitor comparison

Visa (NYSE: V), Mastercard (NYSE: MA), Capital One (NYSE: COF), and JPMorgan Chase (NYSE: JPM) remain separately listed in their reviewed 2026 issuer disclosures. **Discover is no longer an independent peer**: Capital One completed its acquisition on **May 18, 2025**, retaining Discover/PULSE/Diners Club network businesses. Capital One's year-over-year growth includes acquisition/comparability effects. [V26; MA26; COF26; JPM26; COFD]

Financial periods below all end **June 30, 2026**; Visa calls this **fiscal Q3**, others calendar Q2. Revenue and income are USDm. Growth is company-reported rounded growth unless a formula is printed. [V26 July 28; MA26 July 30; COF26 July 21; JPM26 July 14; Q26 July 24]

| Metric | Amex | Visa | Mastercard | Capital One / Discover | JPMorgan |
| --- | --- | --- | --- | --- | --- |
| Model | Integrated issuer/network/lender | Network/services | Network/services | Consumer/commercial bank + networks | Diversified bank + major card issuer |
| Quarterly revenue | 19,637 net interest expense | 11,633 net revenue | 9,277 net revenue | 15,850 total net revenue | 57,347 reported; 58,022 managed |
| Revenue growth | 10% | 14% | 14% | 27%, acquisition affected | 28% reported; 27% managed |
| GAAP diluted EPS, USD | 4.53 | 2.97 | 4.97 | 4.73 | 7.70 |
| EPS growth | 11% | 10% | 22% | Prior −8.58; percentage NM | 47%, gain affected |
| Profitability context | Pretax `4,071/19,637=20.7%` | Net margin `5,628/11,633=48.4%` | Reported operating margin 60.2% | Reported ROE 10.76% | Reported ROE 24% |
| ROE comparison | 36.4%, company quarterly convention | 61.19%, vendor TTM | 241.20%, vendor TTM | 10.76%, quarterly | 24%, quarterly |
| Consumer credit exposure | Material unsecured card assets | Primarily settlement/client exposure; not card issuer credit book | Same distinction | Material, broader customer mix | Material within diversified bank |
| Credit loss indicator | 2.0% consumer/SME principal, global combined | Issuer card charge-offs N/A | Issuer card charge-offs N/A | Domestic card NCO 4.71% | Card NCO 3.34% |
| Bank CET1 | 10.4% | Bank CET1 comparison N/A | Bank CET1 comparison N/A | 13.7% | Standardized 14.1% |
| Volume growth | Billed business 9% reported | Payments 10%, constant dollar | Purchase volume 10%, local currency | Acquisition affects network comparison | Debit/credit sales 10% |
| Q2 buybacks | USD2,241m | USD4.9bn | USD4.9bn | USD2.7bn | USD6.2bn net |

ROE values for Visa/Mastercard are secondary industry-comparison statistics, not same-period issuer-calculated ROE; treasury-stock reductions make Mastercard's small book denominator particularly distorting. Different margin rows are explicitly **not** like-for-like operating margins. Credit-loss denominators, geography, card mix and interest/fee inclusion also differ; do not interpret the table as an exact loss-risk ranking. [PV; PMA; issuer sources above]

JPMorgan's quarter included **USD4.6bn pretax net Visa-share gains** and **USD1.0bn other equity-investment gains**. Its disclosed EPS excluding significant items was **USD6.14**, versus **USD7.70 GAAP**. AXP's apparent growth discount to JPM's GAAP growth therefore exaggerates the recurring difference. [JPM26, Significant Items and footnote 2]

| Market multiples / yield, indicative September 22, 2026 vendor snapshot | AXP, independently calculated | V | MA | COF | JPM |
| --- | --- | --- | --- | --- | --- |
| Trailing P/E | 18.51× | 30.82× | 30.57× | 13.13× | 14.59× |
| Price/book | 6.30× **common book** | 19.19× | 86.91× | 1.22× | 2.56× |
| Indicated dividend yield | 1.25% | 0.74% | 0.63% | 1.60% | 1.94% |

Peer figures are vendor estimates, not reconstructed identical-accounting multiples; their reporting/earnings adjustment and book definitions can differ. Sources [PV; PMA; PCOF; PJPM], each statistics page retrieved September 23 with September 22 close context. AXP formulas: P/E=`305.07/16.48`; common P/B=`305.07/[(34,280−1,584)/675]`; yield=`(0.95×4)/305.07`. AXP's calculated dividend yield annualizes the declared quarterly rate; future declarations are not guaranteed. [Q26; PX]

Network acceptance/customer demographics: Amex discloses its premium focus and estimated acceptance counts; bank/network peers serve much broader issuer and income populations. A consistently defined latest acceptance count, customer-income distribution and comparable cohort retention for **all five**: **Data not found in the reviewed primary sources.** No false precision is assigned to those comparisons.

Interpretation: Amex's valuation between consumer lenders and asset-light networks makes economic sense. It has more recurring fee/network economics than a generic card lender, but must retain capital against credit losses. Visa/Mastercard face major network/antitrust and client-incentive risks while avoiding most cardholder lending losses; Amex faces both classes of risk.

## 11. Management and capital allocation

Stephen Squeri has been chairman/CEO since **2018**. Christophe Le Caillec is CFO in the reviewed 2026 materials. Management's demonstrated achievement is growth **per share**, not merely a larger balance sheet: 2022–25 diluted EPS CAGR **16.01%** exceeded net-income CAGR **12.97%**, and common BV/share CAGR was **14.31%**; formulas are in section 6. [P26, biographies; K25; calculations]

| Guidance vintage | Original guidance | Actual outcome / evaluation |
| --- | --- | --- |
| January 26, 2024, for FY2024 | Revenue +9–11%; EPS USD12.65–13.15 | Revenue `65,949/60,515−1=8.98%`, rounds to 9%; EPS14.01, or13.35 ex Accertify. Operationally exceeded EPS range, not solely via gain. |
| January 24, 2025, for FY2025 | Revenue +8–10%; EPS USD15.00–15.50 | Revenue `72,229/65,949−1=9.52%`; EPS15.38. Within original ranges. |
| January 30 / July 24, 2026 | Revenue initially +9–10%, later +10%; EPS17.30–17.90 unchanged | Not yet an achieved full-year result. H1 supports progress, not proof. |

Sources [E23; E24; E25; E26; K25]. This is a verified recent sample, not a claim of perfect long-term forecasting accuracy.

The company returned **USD2,887m** in Q2 2026 through **USD2,241m repurchases plus USD645m common dividends**; the apparent USD1m difference is rounding in the reported components. The reported repurchase average was **USD315.77/share**, above the present USD305.07 reference. That is not by itself proof of poor allocation, but it is also not evidence of valuation discipline. Intrinsic value at purchase matters more than a subsequent quote. [Q26, Capital Management and repurchase table]

For FY2023/24/25, equity-statement common repurchases were **USD3,519m / 5,857m / 5,311m**. These differ from cash-flow “repurchases and other” because of timing, classifications and other share-related cash flows. The report does not substitute one for the other. Full five-year execution-weighted repurchase prices on an identical basis: **Data not found in the reviewed primary sources.** [K25, Statements of Shareholders' Equity and Note 15]

Capital policy targets CET1 **10–11%** while returning excess capital. That is sensible conditional on loss forecasting, but leaves less discretionary distribution capacity in a stress event. On August 12, Amex issued Series E preferred shares with **USD1,600m liquidation preference and 6.450% coupon**, and announced plans to redeem Series D on September 15. Completion of that redemption was not independently confirmed in the reviewed documents; the forecast explicitly assumes replacement, not permanent double preferred capital. [Q26; PREF]

Growth investment has a coherent rationale—fees and engagement—but disclosed total benefit expenses are rising quickly. Acquisitions should be judged by incremental customer/merchant economics, not just platform users. The **USD700m proposed cash acquisition of TheFork**, announced June 15, was expected to close before end-2026 subject to approvals; it is **not treated as completed**. Standalone acquisition ROIC and a reliable synergy NPV: **Data not found in the reviewed primary sources.** [FORK; Q26]

Governance is mixed-positive. The 2026 proxy reports Squeri's **2025 SEC Summary Compensation Table total of USD46,239,805**, compared with **USD37,164,405 in 2024**, and CFO total **USD13,090,458 in 2025**. These are SEC compensation-table totals, not cash salary or a claim that all awards were realized. Compensation includes long-term incentives and performance measures; high ROE and EPS targets should still be examined for buyback/leverage incentives. [P26, Summary Compensation Table, p.72 and Compensation Discussion]

As of March 6, 2026, Squeri held **223,990 owned shares plus 233,611 exercisable/acquirable shares**; the director/executive group held **501,133 owned plus 448,594 rights**, less than 1%. Berkshire's **22.1%** disclosed beneficial stake is not management insider ownership. An August 19 Form 4 reported Monique Herena's August 18 sale of **8,811 shares at weighted-average USD337.41**, leaving **12,444.723 shares**. One sale is not a comprehensive insider-flow signal. [P26, Ownership p.94; F4]

Assessment: good reinvestment/per-share record; communications generally useful, especially disclosure of presentation changes. Reservations are executive-pay magnitude, insufficient quantitative cohort/marketing economics, and buybacks not clearly tied to intrinsic value.

## 12. Growth opportunities

Probabilities below are **qualitative analyst judgments over 3–5 years**, not measured odds. Potential scale is relative to Amex, not an invented addressable market. Historical evidence comes from [K25, segment/statistical tables; Q26; AR25; FORK], with transcript-only details explicitly marked T.

| Driver | Supporting historical/latest evidence | Potential scale; investment | Main risk | Success probability; monitor |
| --- | --- | --- | --- | --- |
| New cardmembers | 12.5m acquired FY2025;3.0m Q2 2026 | High; acquisition rewards/marketing | Lower-quality or incentive-only customers | Medium-high; new fee-paying cards, seasoning |
| Millennials/Gen Z | Approx.65% of FY2025 new global consumer accounts | High lifetime potential; age-relevant benefits | Income not yet mature, retention unknown | Medium-high; mature-cohort spend/retention |
| Premium cards | Fees USD9,993m in2025, USD2,862m Q2 | High; benefits and servicing | Competitor refreshes, benefit fatigue | Medium-high; net fees less incremental VCE |
| Annual card-fee increases | Q2 fees `2,862/2,480−1=15.4%` | High near-term; upfront refresh cost | Renewal attrition; delayed fee recognition | High near-term, medium long-term; renewal cohorts |
| Travel/entertainment | T reports Q2 FX-adjusted T&E+10% | Material; lounges/travel infrastructure | Recession/geopolitics/airfare inflation | Medium; real transactions and benefit usage |
| Small business | CS2025 revenue16,926m; Q2 billings+5% reported | Material; lending and workflow tools | SME failures and competitors | Medium; SME balances, delinquency, share |
| Corporate customers | Global relationships; T describes expense-management pilot | Medium; software integration/sales | Ramp/Brex and bank competition | Medium; implementation, retention, spend |
| International | ICS2025 revenue13,000m; Q2 revenue3,619m | High; local products/acceptance | FX, regulation, localized execution | Medium-high; constant-currency spend/profit |
| Merchant acceptance | >170m estimated locations FY2025 | Medium incremental; acquisition/network cost | Lower discount yield, denominator overcount | Medium; usable acceptance and net revenue yield |
| Digital payments | Network/data capabilities; T discusses agentic projects | Unquantified; technology and fraud controls | Disintermediation, liability, poor adoption | Medium; transactions, fraud, economics |
| Partnerships/dining | Proposed TheFork700m;50,000+ restaurants in11 European countries | Medium; acquisition/integration | Unproven incremental returns | Medium; card acquisition/retention, integration |
| Loan growth | FY2025 card loans151,832m vs139,674m | High earnings impact; funding/capital | Losses outrun spread | Medium; risk-adjusted NII less provisions |
| Cross-selling deposits/services | June2026 deposits156,973m | Medium; product/servicing investment | Rate-sensitive balances rather than loyalty | Medium; retention, funding cost; T's penetration claim unverified |

The sensible investment test is incremental **after-credit, after-benefits, after-capital** profit. Booking growth, card count, fees or AI coding speed alone do not answer it. No separate numerical AI savings, international TAM, or dining synergy value is included in valuation.

## 13. Risk matrix

Probabilities refer to meaningful adverse pressure over **five years**, not a forecast of the next quarter. High/medium/low labels and mitigations are analyst judgments. Evidence base: [K25, Item1A Risk Factors, Business/Supervision and Notes 2–3/17/21; Q26, Risk Management and Legal Proceedings]; specific current indicators are in sections 5–8 and14.

| Risk | Probability / impact | Evidence and early warning | Possible mitigation | Financial metrics affected |
| --- | --- | --- | --- | --- |
| Recession | Medium / High | Cyclical spending/unsecured credit; slowing billings | Tighten underwriting, liquidity/capital retention | Revenue, provisions, EPS |
| Unemployment | Medium / High | Credit models use macro inputs; rising 30+ balances | Limits, collections, loss reserves | Delinquencies, write-offs, ROE |
| Higher credit losses | Medium / High | Current losses below stress; reserve releases | Pricing, underwriting, slower growth | Provision, EPS, CET1 |
| Interest-rate changes | High / Medium | Q26 +100bp NII sensitivity −USD90m | Matched funding/hedging | NII, OCI, valuation |
| Funding costs | Medium / High | Deposits/debt support card assets | Diversified funding, maturity management | NII, spread |
| Deposit competition | High / Medium | Deposit pricing is competitive | Direct-customer relationships, liquidity | Deposit growth/cost, NII |
| Liquidity disruption | Low / High | Maturity/settlement needs persist in stress | Cash, committed facilities, collateral | Funding costs, capital distribution |
| Higher capital requirements | Medium / High | Bank-regulated issuer | Retain earnings, adjust balance growth | CET1, buybacks, sustainable ROE |
| Card-fee regulation | Medium / Medium | Consumer-protection/pricing scrutiny | Compliance, product redesign | Fees, acquisition economics |
| Network regulation | Medium / High | Routing/merchant-pricing exposure | Adapt contracts/markets | Discount revenue, network margin |
| Antitrust action | Medium / High | Disclosed merchant/network litigation | Legal defense, controls, reserves | Fines, margin, franchise economics |
| Premium-card competition | High / High | Rival issuers' fees/benefits competition | Differentiated service/partners | Attrition, VCE, marketing |
| Fintech disruption | High / Medium | Commercial workflow competition | Product/software investment | CS billings, acquisition cost |
| Important partner loss | Medium / High | Co-brand dependence; portfolio transfers | Diversify, win customers directly | Billings, NII, expense |
| Reduced premium demand | Medium / High | Annual fees require perceived value | Refresh/manage offers | Fees, retention, rewards usage |
| Rewards inflation | High / High | Rapid service costs; URR/WAC sensitivity | Partner funding, benefit redesign | VCE/revenue, EPS |
| Cybersecurity | Medium / High | Concentrated data/network operations | Security/resilience investment | Fraud, remediation, trust |
| Fraud | High / Medium | Payment and account exposure | Closed-loop analytics/controls | Losses, service costs |
| Travel weakness | Medium / Medium | Travel benefits and spending exposure | Diversified everyday spending | Billings, discount, fees |
| FX movements | High / Medium | International earnings and translation | Local funding/hedging | Reported growth, profit, OCI |
| Multiple contraction | Medium / High | Equity valuation sensitive to growth/rates | Entry-price discipline | Shareholder return, not GAAP EPS |

A useful quantification of rewards-model risk: at December 31,2025, Amex estimated that **+25bp ultimate redemption** would increase the liability/expense by **USD229m**, and **+1bp weighted-average cost per point** by **USD244m**. These are separate company sensitivities, not assumed simultaneous changes. [K25, Critical Accounting Estimates—Membership Rewards]

## 14. Macroeconomic sensitivity

The official observations below were available by the cutoff. They are snapshots, not an econometric forecast. [GDP; JOBS; CPI; PCE; FOMC; UST10; UST2; USD; FEDC]

| Factor / observation | Observation and publication date | Transmission to Amex; analyst interpretation |
| --- | --- | --- |
| Real GDP | Q2 2026 +1.5% annualized, second estimate August26; Q1 +2.1% | Slower real activity can restrain corporate/consumer spending and lending; nominal billings may still grow. |
| Unemployment | August2026 4.1%, released September4 | Employment loss drives delinquency, then charge-offs/provisions; premium mix moderates, does not eliminate. |
| Inflation | August CPI +3.4% YoY, +0.4% SA MoM; core+2.4% YoY; September11 | Nominal billings benefit but rewards, labor and household pressure can offset. |
| Consumer spending | July2026 nominal PCE+0.2% MoM, realPCE0.0%; August26 | Nominal spending growth is not proof of stronger real consumption. |
| Travel prices | August airline fares+23.4% YoY CPI; September11 | Larger tickets can inflate spending without passenger growth; rewards redemption cost can rise. No verified aggregate real-travel-spending elasticity assumed. |
| Fed policy | September16 target range raised25bp to3.75–4.00% | Funding/assets reprice at different speeds; valuation discount rate rises if persistent. |
| Yield curve | September21 Treasury10-year4.96%,2-year4.76%, updatedSeptember22 | Calculated spread `4.96−4.76=0.20pp=20bp`; curve affects refinancing/valuation, not a one-for-one loan margin. |
| Consumer credit | Q2 bank-card charge-offs3.82% SA annualized, August25 release | Relevant cycle benchmark; definitions differ from Amex. |
| U.S. dollar | Broad index119.5133, January2006=100; September18, updatedSeptember21 | Stronger dollar reduces translated foreign revenue/profit; travel patterns and natural hedges complicate impact. An index level alone is not a YoY growth rate. |

Amex's own June30 balance-sheet sensitivity is more useful than assuming “higher rates help lenders”: **+100bp parallel shock: annual NII −USD90m; +200bp: −USD401m; −100bp: +USD98m; −200bp: +USD185m**. These are company scenario estimates, not forecasts; deposit behavior, hedging and balance-sheet changes matter, and the response is nonlinear. [Q26, Item3, p.73]

Taken together, the macro backdrop is mixed: positive but slower real growth and stable employment support credit; sticky inflation and higher funding/discount rates constrain the valuation case. No statistical GDP/unemployment-to-EPS coefficient is fabricated.

## 15. Valuation

All values in this section are **analyst estimates in USD per common share**, dated September23,2026. No enterprise-value/EBITDA multiple or generic industrial-company DCF is used. The three methods value common equity after the economic burden of funding, losses and preferred capital.

### Method 1: normalized earnings × P/E

`Fair value = normalized annual diluted EPS × justified near-term P/E.`

| Assumption | Bear | Base | Bull |
| --- | --- | --- | --- |
| Normalized EPS, USD | 14.00 | 17.20 | 18.00 |
| Applied P/E | 14× | 19× | 23× |
| Value, USD/share | 196.00 | 326.80 | 414.00 |

Base EPS **17.20** is an assumption: FY2026 guidance midpoint **17.60**, less an analyst **0.40/share** normalization cushion for favorable credit/other earnings effects. The cushion is not a reported adjustment and is not claimed to equal one specific reserve release. Bear14 assumes lower cycle-normal earnings; bull18 assumes premium growth sustains higher recurring earnings. [E26 for guidance; Q26 for current credit/earnings context]

A base19× recognizes fee/network durability but remains materially below the roughly30× vendor peer multiples for Visa/Mastercard. It allows stronger near-term growth than a mature card lender, while recognizing balance-sheet and regulatory exposure. Bear14× prices lower growth/higher losses; bull23× requires durable premium growth and better reinvestment returns. They are not justified merely by historical trading averages. The corresponding required-return judgments are **12% / 10.5% / 9.5%**, used explicitly in the other methods. This earnings-multiple method has no separate terminal value or mechanical discount step; the multiple embeds growth/duration and risk.

P/E sensitivity, calculated `EPS×multiple`, USD/share:

| EPS / multiple | 16× | 18× | 20× | 22× |
| --- | --- | --- | --- | --- |
| 15.00 | 240 | 270 | 300 | 330 |
| 17.20 | 275.20 | 309.60 | 344.00 | 378.40 |
| 19.00 | 304 | 342 | 380 | 418 |

Strength: transparent and close to the market's earnings framework. Limitation: selecting normalized earnings and a multiple can hide double optimism about both credit and growth.

### Method 2: justified common price/book

Reported June2026 common-book anchor, calculated from [Q26, balance sheet and preferred-share disclosures]:

`BV0 = (USD34,280m total equity − USD1,584m preferred carrying capital) / 675m ending common shares = USD48.4385/share.`

`Justified P/B = (sustainable common ROE−g)/(k−g); value = BV0×justified P/B.`

| Assumption / result | Bear | Base | Bull |
| --- | --- | --- | --- |
| Sustainable **common** ROE | 24% | 32% | 36% |
| Required common-equity return k | 12% | 10.5% | 9.5% |
| Perpetual nominal book/earnings growth g | 3% | 5% | 6% |
| Justified P/B, formula | `(24−3)/(12−3)=2.333×` | `(32−5)/(10.5−5)=4.909×` | `(36−6)/(9.5−6)=8.571×` |
| Value, USD/share | 113.02 | 237.79 | 415.19 |

These ROEs are assumptions about future common equity, not the company's reported total-equity ROE. Base implies terminal retention `g/ROE=5/32=15.625%` and distributable payout **84.375%**; that requires ongoing capital efficiency. Long-run growth is below explicit-period earnings growth. Bull's6% perpetual rate is aggressive and one reason its valuation should not anchor a purchase.

The base10.5% return is a judgmental hurdle, not a fitted CAPM estimate: it is `10.5−4.96=5.54pp` above the September21 Treasury10-year yield. A Treasury yield is not a risk-free promise about reinvestment over the whole model horizon. [UST10; analyst assumptions]

Sensitivity grids varying **k9.5–11.5%** and **g4–6%** at32% ROE are printed with formulas in the workbook. For example, base inputs give237.79, while increasing k to11.5% with g5% gives `48.4385×(0.32−0.05)/(0.115−0.05)=USD201.21`.

Strength: links value to sustainable returns and required capital. Limitation: Amex's brand/network value is not fully represented by historical accounting book; immediate steady state understates a near-term high-growth franchise. Conversely, repurchases at high P/B can mechanically elevate reported ROE and should not be mistaken for stronger unit economics.

### Method 3: residual income

This is an **aggregate common-equity model**, divided by current shares only at the end. Buybacks are included in aggregate payouts, not separately added to value or also used to shrink the denominator.

`V0 = [B0 + Σ(t=1..5){[E(t)−k×B(t−1)]/(1+k)^t} + [(ROEterminal−k)×B5/(k−g)]/(1+k)^5] / S0.`

Inputs: `B0=USD32,696m`; `S0=675m`; `E0=normalized EPS×675`; `E(t)=E0×(1+earnings growth)^t`; `B(t)=B(t−1)+25%×E(t)`. Explicit aggregate earnings growth is **4% / 10% / 13%** bear/base/bull. Common payout—including buybacks—is **75%** for the first five years. Terminal ROE, g and k are the same as the justified-P/B method. Clean-surplus book accounting, no material future OCI shock, and adequate regulatory capital are assumptions.

Results: **USD132.50 bear / USD294.02 base / USD517.41 bull**. The workbook prints each year's opening book, earnings, residual income, closing book and terminal calculation, plus k/g sensitivities. The terminal calculation deliberately resets earnings to sustainable ROE×book, rather than extending peak year-five earnings indefinitely.

Base example: `E0=17.20×675=USD11,610m`; `E1=11,610×1.10=12,771`; `RI1=12,771−0.105×32,696=USD9,337.92m`; `B1=32,696+0.25×12,771=USD35,888.75m`. Year5 book is **USD52,188.0580m**; terminal residual value is `(0.32−0.105)×52,188.0580/(0.105−0.05)`. Discounting and dividing by675 yields294.02. Subsequent exact substitutions are in the workbook.

Strength: explicitly charges equity capital and avoids treating bank debt/deposits as industrial-company net debt. Limitation: terminal ROE/g dominate; clean-surplus assumptions and regulatory-capital retention can fail. A narrow quoted value would be misleading.

### Synthesis and market context

| Present fair value, USD/share | Bear | Base | Bull |
| --- | --- | --- | --- |
| Normalized P/E | 196.00 | 326.80 | 414.00 |
| Justified P/B | 113.02 | 237.79 | 415.19 |
| Residual income | 132.50 | 294.02 | 517.41 |
| **Blend: 40% P/E +20% P/B +40% RI** | **154.01** | **295.88** | **455.60** |
| Rounded research fair value | **154** | **296** | **456** |

Weights are analyst judgments, not fitted probabilities. All three methods share assumptions, so averaging them does not create independent statistical evidence. The lower P/B value reflects immediate steady state; RI permits an explicit high-growth period. Use a range, not cents of precision.

Historical vendor fiscal-year-end P/Es for2021–25 are **16.01×,14.92×,16.54×,20.92×,23.82×**. They are quoted vendor historical valuation statistics, not this report's recalculated multiples. Their exact price/earnings adjustments are not fully documented in the reviewed page. At year-end2025, the proxy's USD369.95 price divided by reported EPS15.38 gives **24.05×**, demonstrating a definitional difference from the vendor23.82×; the primary-price/GAAP-EPS calculation controls when making that exact comparison. [PH; P26, Outstanding Equity Awards price footnote; K25]

The broader market's forward12-month P/E was **19.1× as of September18**, attributed to FactSet in a September22 secondary market report. The original FactSet PDF was not accessible; this is secondary market context only, not a valuation input. AXP's17.33× FY2026 guidance midpoint is cheaper but uses a different earnings horizon and is not directly equivalent to forward12-month consensus. [SPX; E26; PX]

A Treasury yield near5% raises the burden of proof for a credit-sensitive equity at roughly19× normalized earnings. AXP's lower multiple than asset-light networks is justified; a lower multiple than its own recent peak does not alone make it cheap.

## 16. Bear, base, and bull cases

**Every forward number here is an analyst assumption or calculation, not company guidance.** Model years1–5 are annual investment periods ending September2027–2031, using June2026 TTM flows and June balance-sheet stocks as a starting run rate. They are not calendar fiscal-year forecasts. The intervening quarter is not separately forecast. The complete five annual schedules for revenue, billings, fees, balances, NII, yield, provisions, expenses, tax, shares, repurchases, EPS and dividends are in the workbook.

| Operating assumption | Bear | Base | Bull |
| --- | --- | --- | --- |
| Billed-business annual growth | 3% | 8% | 11% |
| Card-fee annual growth | 6% | 12% | 16% |
| Card/other balance annual growth | 4% | 8% | 10% |
| Service/other annual growth | 3% | 8% | 11% |
| GAAP all-balance net interest yield | 7.6% | 8.1% | 8.4% |
| All-in card write-off rate incl interest/fees | 4.0% | 2.4% | 2.0% |
| Reserve coverage after initial adjustment | 3.5% | 2.7% | 2.5% |
| Total expenses/revenue, years1→5 | 74.5→74.25→74.0→73.75→73.5% | 73.5→73.25→73.0→72.75→72.5% | 73.0→72.5→72.0→71.5→71.0% |
| Effective tax | 25.0% | 23.5% | 22.5% |
| Net annual share retirement | 0.5% | 2.0% | 2.5% |
| Annual DPS growth | 3% | 10% | 13% |
| Year5 exit P/E | 14× | 16× | 20× |

Discount revenue grows with billings at a constant TTM ratio `38,972/1,749,900`. NII=`midpoint average all-inclusive balances×yield`; revenue is the sum of discount, fee, service and NII lines—**revenue growth is derived, not an independent inconsistent assumption**. Provisions equal modeled write-offs plus the change in required reserves plus an other-credit allowance. Thus the bear's first year includes a reserve build, rather than assuming cash charge-offs are the only recession expense. Full equations and initial inputs appear in the workbook and assumption register.

| Calculated scenario output | Bear | Base | Bull |
| --- | --- | --- | --- |
| Year1 / Year5 revenue, USDm | 77,578 / 89,677 | 82,120 / 114,299 | 84,872 / 131,404 |
| Derived revenue CAGR, Year1→Year5 | `(89,677/77,578)^(1/4)−1` = 3.7% | `(114,299/82,120)^(1/4)−1` = 8.4% | `(131,404/84,872)^(1/4)−1` = 11.5% |
| Year1 / Year5 provision, USDm | 11,362 / 11,252 | 6,346 / 8,633 | 5,128 / 8,147 |
| Year1 / Year5 EPS, USD | 9.16 / 13.96 | 17.37 / 27.93 | 20.38 / 38.11 |
| EPS path years1–5, USD | 9.16 /11.75 /12.45 /13.18 /13.96 | 17.37 /19.56 /22.03 /24.81 /27.93 | 20.38 /23.41 /27.55 /32.41 /38.11 |
| Year1 / Year5 modeled diluted shares, m | 673.31 /659.95 | 668.25 /616.37 | 666.56 /602.36 |
| Year1 / Year5 repurchase cash proxy, USDm | 433 / 647 | 4,455 / 6,608 | 7,910 / 13,365 |
| Year5 DPS, USD | 4.41 | 6.12 | 7.00 |
| Year5 terminal price, USD | 195.50 | 446.90 | 762.12 |
| Five-year cash dividends, USD/share | 20.78 | 25.52 | 27.83 |
| Cash dividend return on305.07, not reinvested | 6.81% | 8.36% | 9.12% |
| **Five-year annualized total-return IRR** | **−6.9%** | **9.4%** | **21.3%** |

Terminal price=`EPS5×exit multiple`; dividend cash return=`sum(DPS1…DPS5)/305.07`. Total-return IRR solves `305.07=Σ DPS(t)/(1+r)^t + terminal price/(1+r)^5`, with dividends paid at each year-end. It is not simply price CAGR plus dividend yield. No investor taxes, trading costs or dividend reinvestment assumed. Exact unrounded inputs are in the workbook/model.

The base exit16× is deliberately below the near-term normalized19× valuation assumption: a mature franchise five years hence should not automatically retain today's growth premium. It is close to the steady-state P/E implied by the base book model: `(1−0.05/0.32)/(0.105−0.05)=15.34×`. No second buyback “yield” is added to modeled EPS growth or total return.

**Bear path:** unemployment/SME stress, weak discretionary spending, rate/funding pressure and benefit inflation; first-year reserve build depresses EPS below normalized14. It is a plausible adverse cycle, not an insolvency stress test. Dividend growth and repurchases could be suspended in a worse event.

**Base path:** sustained high-single-digit spending/balance growth, double-digit fees, stable credit with some normalization, and modest all-in cost leverage. Repurchases remain subordinate to capital. It requires fee/engagement economics to improve after upfront refresh spending.

**Bull path:** premium relevance and international growth remain strong, credit stays unusually favorable, and expense discipline produces more leverage. Its write-offs/reserve coverage and terminal valuation are optimistic; it is not a hidden base case.

These scenarios are not probability weighted. The intrinsic-value models and five-year operating model are different lenses: the former include long-run fade/capital assumptions; the latter measures a finite holding-period outcome at a specified exit multiple. A terminal share price is not present intrinsic value.

## 17. Margin of safety

Use unrounded base fair value **USD295.8843**. `Purchase price=base fair value×(1−required margin)`. [Analyst valuation]

| Margin of safety | Maximum price, USD |
| --- | --- |
| 10% | `295.8843×0.90 = 266.30` |
| 20% | `295.8843×0.80 = 236.71` |
| 25% | `295.8843×0.75 = 221.91` |
| 30% | `295.8843×0.70 = 207.12` |

Current margin of safety=`1−305.07/295.8843=−3.1%`; valuation upside/downside=`295.8843/305.07−1=−3.0%`. These use different denominators and should not be conflated.

Return-target entries use the base operating scenario's dividends **USD4.18,4.598,5.0578,5.56358,6.119938** and terminal price **USD446.8965**:

`Maximum entry(r)=4.18/(1+r)+4.598/(1+r)^2+5.0578/(1+r)^3+5.56358/(1+r)^4+(6.119938+446.8965)/(1+r)^5.`

| Target annualized IRR | Maximum entry, USD |
| --- | --- |
| 8% | 324.23 |
| 10% | 296.49 |
| 12% | 271.59 |
| 15% | 238.85 |

**Watchlist range: USD235–240**, approximately the20% intrinsic-value margin and the15% base-scenario return threshold. These conditions are not independent promises: a lower price caused by deteriorating fundamentals requires a new valuation, not automatic buying.

## 18. Market and technical context

Market timestamp: **September22,2026, 4:00p.m. EDT regular close**. Primary price reference is corroborated across Stock Analysis and FinanceCharts; market data are permitted secondary sources. [PX; PX2]

| Indicator | Reading | Interpretation / limitation |
| --- | --- | --- |
| Close | USD305.07 | Reference used for all return calculations |
| 50-day moving average | USD335.16 | Price below intermediate trend |
| 200-day moving average | USD335.02 | Price below longer-term trend |
| 52-week range | USD290.97–387.49 | Range extrema, not intrinsic-value bounds |
| RSI | 28.86, vendor reported | Vendor lookback/calculation not independently reproduced; no standalone oversold buy signal |
| 20-day average volume | 2,701,953 shares | Vendor series, not independently exchange-reconciled |
| September22 volume | **Unresolved source conflict** | FinanceCharts4,972,779; Stock Analysis5,102,664; Investing.com3.32m. No single value adopted. |

Sources [PX statistics/overview; PX2; PX3], retrieved September23; vendor statistics page updated September22. The volume disagreement may reflect vendor methodology/timing, but its actual cause was not verified and is not asserted.

Short-term trend is weak; medium/longer-term moving-average context is weak because price is below both averages. The52-week low around291 is a potential reference support zone; the335 moving-average area is potential resistance, with the52-week high near387 farther above. These are **analyst reference levels derived from the cited price/range/averages**, not verified repeated-test support/resistance. A complete chart-pattern/long-term secular-trend audit was not conducted. Technical weakness does not override fair value or justify catching a falling price.

Important vendor conflict: PX reports TTM revenue **USD70.91bn**, versus filing-derived **USD75.950bn**; vendor EPS16.47 versus the summed reported16.48; vendor book/share50.79 versus this report's **common** book48.44. The revenue methodology was not reconciled, so the vendor fundamental number is rejected. EPS rounding/weighting can differ; the report explicitly uses summed period EPS. For book, subtracting preferred capital explains why a total-equity/share number is not common BV. Use SEC/company inputs for AXP underwriting, vendor pages only for permitted market/peer context.

## 19. Catalysts

The windows below are analyst expectations over the next6–24 months, not verified event dates unless stated. Probabilities describe occurrence/relevance, not the probability of a positive share-price reaction. [Q26; E26; FORK; K25; FOMC; T where noted]

| Catalyst | Window | Potential effect | Probability | Monitor / evidence |
| --- | --- | --- | --- | --- |
| Subsequent earnings/guidance | Next1–6 months, then quarterly | Validate or reduce growth/margin assumptions | High | Spend, fee growth, provision, EPS versus E26 guidance |
| Platinum fee recognition catches up with benefits | Next6–12 months | Better contribution margin if retention holds | Medium-high | Fees versus services/rewards; T's high-teens exit guidance is not independently authenticated |
| Lapping card-refresh investment | Next6–12 months | Slower VCE growth, but not necessarily lower expense dollars | Medium | VCE/revenue, incremental pretax profit |
| Credit/reserve normalization | Next6–18 months | Either release support ends or stronger credit persists | High relevance | Monthly30+, write-offs, reserve bridge; M8 |
| Co-brand portfolio transfers/lapping | Next6–12 months | Reported spending/NII comparability improves later | High relevance | Held-for-sale assets, disposition effects; Q26; T's quantified headwinds not used as verified forecasts |
| Proposed TheFork transaction | Before end2026 management expectation; benefits later | Integration cost first; potential dining/retention value later | Medium-high completion, medium value creation | Regulatory clearance, purchase accounting, incremental economics; FORK |
| Potential GBT stake disposition | Timing conditional, next6–12 months | Possible nonrecurring gain/capital deployment | Medium | Closing and after-tax proceeds; Q26; exclude gain from recurring EPS |
| Repurchases/dividends | Ongoing6–24 months | Per-share accretion subject to price and capital | High, conditional on capital | CET1, purchase price, share reduction |
| Funding/rate changes | Next6–24 months | NII and valuation can move in opposite directions | High relevance | Deposit beta, refinancing cost, Q26 rate sensitivity |
| Technology/productivity or regulatory decisions | Next6–24 months | Costs, competitiveness or network economics | Medium, outcome uncertain | Realized expense ratios, controls, official decisions |

## 20. Investment thesis and anti-thesis

**Arguments supporting investment:**

1. Spending, fees and lending reinforce a recurring customer relationship; Amex earns from several dimensions of engagement. [K25; Q26]
2. Fee growth and younger-customer recruitment support durability beyond a single legacy affluent cohort. [AR25; Q26]
3. Comparable credit metrics remain strong, while ROE and per-share growth demonstrate monetization rather than only scale. [K25; Q26; M8]
4. International and commercial capabilities provide reinvestment opportunities; capital returns amplify per-share growth when priced sensibly. [K25; Q26]

**Arguments against investment at the current price:**

1. Benefit/rewards investment may be a permanent competitive toll, not a temporarily elevated expense. [Q26; K25 Risk Factors]
2. Current credit costs and reserve releases may flatter through-cycle earnings. [Q26; M8]
3. Premium customers can spend less and default in a recession; high ROE does not remove financial leverage. [K25, credit/risk disclosures]
4. The price already requires substantial earnings durability; base intrinsic value provides no positive margin of safety. [Analyst valuation]

**Strongest bull argument:** Amex has converted a premium-card franchise into a globally scalable membership platform. Fee monetization, younger cohorts and partner-funded benefits could sustain stronger growth with lower losses than old historical multiples imply. If benefit costs moderate while retention holds, the base case underestimates both earnings and duration.

**Strongest bear argument:** the apparent moat is increasingly rented through rewards, benefits and marketing. Affluent customers are financially sophisticated and multihome across cards. When economic growth slows, spending, annual-fee willingness, lending spreads, reserve requirements and the valuation multiple could weaken together. The exceptionally attractive ROE can coexist with poor shareholder returns from an optimistic entry price.

What the market may underestimate: the delayed accounting recognition of fee increases, international premium demand, and the earnings potential of mature new-customer cohorts. What may already be reflected: persistently strong credit, repeatable double-digit fee growth, meaningful operating leverage and continued buybacks. These are interpretations, not claims about investors' directly observed beliefs.

For the base case to work: high-single-digit spending/balance growth, double-digit fees, stable underwriting, moderate expense leverage and capital-compatible repurchases must coexist. Permanent invalidation would be sustained loss of premium willingness to pay, structurally worse loss economics, persistent erosion of merchant/network monetization, or inability to earn returns above the cost of common equity after funding/credit costs.

Evidence that would change the conclusion: quantified strong renewal economics after repricing; sustained VCE stabilization; better cohort disclosure; declining credit without recovery sales; or, negatively, fee growth purchased with still faster benefit costs, aging-related delinquencies, weaker risk-adjusted lending returns, and capital pressure. A falling stock alone does not validate either thesis.

Confirmation-bias check: the report explicitly rejects four tempting shortcuts—calling all expense trends operating leverage, treating a June write-off recovery sale as permanent credit improvement, extrapolating pandemic-base EPS growth, and assigning network-company multiples without bank capital risk. Conversely, it does not interpret new-card counts falling modestly as proof the premium strategy failed.

## 21. Final decision

| Decision item | Assessment |
| --- | --- |
| Information cutoff | September23,2026, Bangkok time |
| Reference share price | USD305.07; September22 U.S. regular close [PX; PX2] |
| Bear / base / bull present fair values | USD154 /296 /456; analyst estimates |
| Bear / base / bull value versus price | −49.5% /−3.0% /+49.3%, using unrounded fair values divided by305.07 minus1 |
| Five-year total-return IRR | Bear−6.9%; base9.4%; bull21.3%; no probabilities assigned |
| Current base margin of safety | −3.1%; `1−305.07/295.8843` |
| Business quality | High; strong, investment-dependent moat |
| Balance-sheet strength | Strong at current conditions; regulated and credit-sensitive, not risk-free |
| Credit quality | Healthy; stable/modestly improving comparable delinquency, favorable recoveries require adjustment |
| Growth outlook | Positive; premium fees/international strongest evidence, commercial more contested |
| Valuation level | Approximately fairly valued, slightly above blended base value |
| Overall risk | Medium; high downside in a correlated spending/credit/valuation shock |
| Final classification | **Watchlist** |
| Price that merits reconsideration | **USD235–240**, conditional on unchanged thesis and updated capital/credit review |

This is a general research judgment, not a personalized position-size or trading instruction. Existing owners should distinguish a valuation concern from a broken franchise; tax, concentration and their own required return affect a hold/sell decision. Future returns can differ materially from every scenario.

## 22. Monitoring checklist

### Ten most important quarterly metrics

1. Billed-business growth, reported and FX-adjusted, by USCS/CS/ICS.
2. Net card-fee growth, fee-paying acquisitions and repriced-cohort retention where disclosed.
3. VCE/revenue and incremental rewards/cardmember-services expense.
4. NII, all-balance net interest yield and funding/deposit cost.
5. Card-balance growth and changes caused by sales or held-for-sale classification.
6. Comparable30+ consumer/SME delinquency, with monthly U.S. data as an early signal.
7. Principal and all-in write-offs, recoveries and sold-written-off-account effects.
8. Provision/reserve bridge and coverage, not provision expense alone.
9. CET1/RWA growth, liquidity and buyback capacity.
10. Recurring EPS, tax/one-time items and diluted-share reduction versus repurchase price.

### Pre-investment checklist

- Reverify the current quote, latest SEC filings, guidance and any post-cutoff corporate actions.
- Review the latest official call/audio, including any material commentary not authenticated here.
- Reconcile loan/Card-balance/yield definitions before comparing periods.
- Recalculate normalized earnings without double-removing reserve/recovery benefits.
- Verify premium renewals, VCE economics and underwriting against the base case.
- Recheck capital after proposed acquisitions and the preferred refinancing.
- Require a satisfactory return under a lower exit multiple, not only a bull valuation.
- Size for recession losses and portfolio concentration; do not borrow against a narrow fair-value estimate.

### Conditions for buying more

Price approaches the watchlist range **and** comparable credit remains sound; premium fee/benefit economics improve; acquisition cohorts mature well; recurring earnings meet or exceed the base trajectory; and capital supports growth plus distributions. Alternatively, a materially stronger evidenced earnings trajectory can justify raising fair value even without a lower price.

### Conditions for reducing or selling

Persistent premium attrition or structurally worsening customer contribution; sustained underwriting deterioration beyond the normal cycle; costly partner/regulatory changes impairing network economics; capital distributions unsupported by risk growth; governance/accounting concerns; or a market price requiring bull assumptions with little downside protection. Short-term price weakness alone is not a sufficient fundamental sell condition.

### Unanswered questions and unavailable information

- Numeric retention by acquisition vintage, product, repricing date and customer cohort; CAC and risk-adjusted LTV: **Data not found in the reviewed primary sources.**
- Precise Q2 rewards-model adjustment and dollar recovery benefit from sold written-off portfolios: **Data not found in the reviewed primary sources.**
- Full comparable card-vintage loss curves and cohort profitability: **Data not found in the reviewed primary sources.**
- Standalone/incremental TheFork, dining-platform, AI and expense-platform investment returns: **Data not found in the reviewed primary sources.**
- A consistent five-year merchant acceptance/customer-age-growth series and exact same-definition peer demographics: **Data not found in the reviewed primary sources.**
- Authenticated word-for-word Q2 call transcript and September16 conference commentary were not reviewed; supplied text is labeled separately.
- Series D redemption completion, proposed acquisition/disposition closing status beyond the reviewed filings, comprehensive insider-flow census, and a reconciled September22 consolidated trading volume remain unverified.

These gaps constrain confidence and argue against using the bull case as the purchase anchor. They do not prevent verification of the core audited financial history, latest filed quarter, subsequent credit report, and market price used here.

### Verification pass

Core annual and latest-quarter financial inputs were cross-checked against the original downloaded SEC documents; reported earnings and guidance were compared with company releases. Dates, stock/flow units, definitions and TTM bridges were checked. The model verifies all six annual revenue/income-statement identities and TTM revenue/net-income reconciliations. Every valuation result is generated from the disclosed code/assumptions. Unsupported numeric retention, AI savings, vintage losses, and unauthenticated transcript-only reported facts were not filled in. Source conflicts, rounded data and remaining uncertainty are explicit. This is research verification, not an audit opinion or a claim that unavailable information was verified.

## 23. Assumption register

**All items below are analyst assumptions.** Historical anchors in sections5–8 and the workbook are reported/calculated data, not assumptions. Unless noted, bear/base/bull order applies. This table and the exact parameter dictionaries in `model.py` form the complete numerical assumption register.

| ID | Assumption | Values / treatment | Reason / limitation |
| --- | --- | --- | --- |
| A1 | Valuation date/horizon | September23,2026; five explicit annual periods | Uses latest June financials; no separate stub-quarter forecast |
| A2 | Normalized diluted EPS | USD14 /17.20 /18 | Cycle/normalization cases; base17.60 guide midpoint−0.40 cushion |
| A3 | Near-term P/E | 14 /19 /23× | Credit-adjusted growth/duration judgment |
| A4 | Required common-equity return | 12 /10.5 /9.5% | Risk hurdle, not estimated CAPM |
| A5 | Sustainable terminal common ROE | 24 /32 /36% | Lower through-cycle return versus sustained premium strength |
| A6 | Perpetual nominal growth | 3 /5 /6% | Must stay below k; bull deliberately optimistic |
| A7 | RI explicit aggregate earnings growth | 4 /10 /13% annually | Does not additionally add per-share buyback accretion |
| A8 | RI retention/payout | 25% retained /75% paid for years1–5 | Payout includes dividends and buybacks |
| A9 | RI starting earnings | A2×675m current-share proxy | Normalized common earnings, not GAAP reported numerator |
| A10 | RI book behavior | Clean surplus, constant preferred capital, no future OCI/acquisition book adjustment | Actual book may differ materially |
| A11 | RI terminal reset | Earnings6=terminal ROE×book5; retention=g/ROE | Imposes fade; not perpetual year5 growth |
| A12 | Value-method weights | P/E40%, P/B20%, RI40% | Subjective; no case probabilities assigned |
| A13 | Operating billings growth | 3 /8 /11% annually | Demand cases |
| A14 | Fee growth | 6 /12 /16% annually | Membership/renewal economics |
| A15 | Card and other-balance growth | 4 /8 /10% annually | Same growth across modeled credit balances; no separate loan/receivable series after reporting change |
| A16 | Service/other growth | 3 /8 /11% annually | No independent acquisition synergy forecast |
| A17 | Discount monetization | Constant TTM38,972/1,749,900 | No further mix/pricing erosion; important downside risk |
| A18 | Average forecast balances | Midpoint(opening,ending) | Smooth growth approximation, not reported average |
| A19 | Net interest yield | 7.6 /8.1 /8.4% on all-inclusive average balances | GAAP-style denominator, not old loan-only yield |
| A20 | All-in annual write-off rate | 4.0 /2.4 /2.0% of average modeled card balances | Includes interest/fee loss proxy; not identical to published principal-only rate |
| A21 | Reserve coverage | Initial rounded2.7%; then3.5 /2.7 /2.5% | First-year build/release included; not a full CECL vintage model |
| A22 | Other-credit provision | USD400m base allowance×(1+balance growth)^t | Simplifying allowance for other credit; not a reported recurring run rate |
| A23 | Total expense ratio path | Bear74.5,74.25,74,73.75,73.5%; base73.5,73.25,73,72.75,72.5%; bull73,72.5,72,71.5,71% | All expenses, not management's narrower OpEx |
| A24 | Forecast tax | 25 /23.5 /22.5% | No discrete benefits assumed |
| A25 | Net annual share retirement | 0.5 /2 /2.5%; starting675m shares | Current common shares used as diluted-share proxy; net dilution effects absorbed here |
| A26 | Forecast diluted average shares | Midpoint modeled opening/ending shares | Not company-issued dilution guidance |
| A27 | Participating award allocation | 0.7% of NI | Simplified recurring EPS numerator deduction |
| A28 | Preferred dividend expense | USD103.2m/year=1,600×6.45% | Assumes Series E replaces D; completion not independently verified |
| A29 | Repurchase pricing | Modeled EPS×case exit P/E; cash=net shares retired×that price | Net-retirement cost proxy; not gross program purchases including offsetting issuance |
| A30 | Dividend starting run rate/growth | USD3.80=0.95×4; grow3 /10 /13% annually | Quarterly dividend annualized as assumption; future dividends not guaranteed |
| A31 | Year5 exit multiple | 14 /16 /20× | Growth premium fades; not current intrinsic-value multiple |
| A32 | Investor cash-flow timing | Year-end dividends and year5 sale | No tax/fees/reinvestment; return is IRR |
| A33 | Financing/capital feasibility | No common issuance or binding capital restriction beyond net-retirement assumptions | Not a full regulatory RWA forecast; stress may require less buyback/dividend |
| A34 | Portfolio/acquisition treatment | No separate sales/GBT gain or TheFork/AI synergy; HFS included in starting all-balance proxy | Steady run-rate scenarios, not deal-specific calendar forecasts |
| A35 | Credit sensitivity | Freeze216,710m for one year; shocks0.50/1.00/1.50pp; tax23.5%;679m shares | Excludes reserve builds, loan/spend feedback and award changes |
| A36 | Reserve-release sensitivity | Tax23.5%, shares679m; remove191m only | Not a full normalized EPS calculation |
| A37 | Entry margins | 10/20/25/30% of base fair value | Not statistical confidence intervals |
| A38 | Target returns | 8/10/12/15% using base cash flows | Deterministic scenario thresholds |
| A39 | Valuation sensitivities | P/E16/18/20/22; EPS15/17.2/19; k9.5/10.5/11.5%; g4/5/6% | One/two-variable tests; not probabilities |
| A40 | Watchlist price | USD235–240 | Approximate20% margin and15% base return hurdle |
| A41 | Qualitative forecasts | Risk/growth/catalyst probabilities and moat direction | Analyst judgments; no numeric odds/TAM implied |

## 24. Sources

Primary documents take precedence for Amex financial facts. Page numbers below are printed document pages where confidently identified; otherwise named sections/tables are supplied. HTML pagination can differ from PDF pagination. Market/peer-valuation pages are secondary and date-sensitive. T is supplied text, not an authenticated publication. No search-results pages are evidence.

| ID | Document / publication or filing date | Relevant pages or sections |
| --- | --- | --- |
| [K21] | American Express2021 Form10-K, filed **February11,2022** | MD&A financial performance p.43; selected statistics; consolidated balance/cash-flow statements; Notes16/21; Statistical Disclosure average balance sheet |
| [K22] | American Express2022 Form10-K, filed **February10,2023** | Presentation Changes; consolidated income/cash-flow statements; selected statistical information; Notes2/3/16; capital management |
| [K23] | American Express2023 Form10-K, filed **February9,2024** | Capital management; credit/segment notes; average balance sheet |
| [K25] | American Express2025 Form10-K, filed **February6,2026** | Business/Item1A; MD&A Tables1–7,8/10/12/14; capital pp.61–63; financial statements; Notes1–3,15,17,21,24; Table2.3; critical accounting estimates; statistical average balance sheet |
| [Q26] | American ExpressQ2 2026 Form10-Q, filed **July24,2026** | MD&A Summary/Presentation Changes; segment/credit tables; capital/liquidity; statements pp.40–44; Notes2–3; Item3 rate sensitivity p.73 |
| [E26] | American ExpressQ2 2026 earnings release,8-K Exhibit99.1, **July24,2026** | Financial results and full-year guidance |
| [E25] | American ExpressFY2025 results/2026 outlook,8-K exhibit, **January30,2026** | Headline guidance and dividend plan |
| [E24] | American ExpressFY2024 results/2025 outlook,8-K Exhibit99.1, **January24,2025** | pp.1–3, AppendixI Accertify EPS reconciliation |
| [E23] | American ExpressFY2023 results/2024 outlook,8-K Exhibit99.1, **January26,2024** | pp.1–2,2024 guidance |
| [E22] | American ExpressFY2022 earnings release, **January27,2023** | New card acquisitions and FY2023 outlook |
| [AR25] | American Express2025 Annual Report, shareholder materials published **March25,2026** | Shareholder letter, PDFpp.4–7; merchant-coverage footnotes PDFp.14; enclosed10-K |
| [P26] | American Express2026 Proxy Statement, filed **March25,2026** | CEO biography; Compensation Discussion; Summary Compensation Table p.72; Ownership p.94; equity-award year-end share-price footnote |
| [M8] | American ExpressAugust2026 credit metrics Form8-K, filed **September15,2026** | U.S.consumer/SME HFI tables; sold-written-off-balance footnote; trust-metric definition |
| [PREF] | American ExpressSeriesE preferred issuance Form8-K, filed **August12,2026** | Items3.03/5.03/8.01, planned SeriesD redemption |
| [F4] | Monique Herena Form4, filed **August19,2026**, transactionAugust18 | TableI and weighted-average-price footnote |
| [FORK] | Proposed acquisition of TheFork, Amex IR announcement **June15,2026** | Purchase consideration, coverage, expected closing/conditions |
| [T] | **User-supplied** Q2 2026 call transcript, labeled **July24,2026** | CFO outlook and CEO/Q&A; link is official event page only, **not proof of transcript authenticity** |
| [V26] | Visa fiscalQ3 2026 earnings release, **July28,2026** | Quarter endedJune30; financial results, capital returns and operational growth |
| [MA26] | MastercardQ2 2026 earnings release, **July30,2026** | Results, capital returns; statements p.7 |
| [COF26] | Capital OneQ2 2026 financial supplement, **July21,2026** | Selected performance, card metrics, capital and repurchases |
| [COFD] | Capital One completion of Discover acquisition, **May18,2025** | Ownership/network structure announcement |
| [JPM26] | JPMorgan ChaseQ2 2026 earnings release, **July14,2026** | Highlights; Significant Items; CCB/card metrics; footnote2 |
| [GDP] | BEA GDP second estimate and corporate profits,Q2 2026, **August26,2026** | Real GDP growth summary |
| [JOBS] | BLS Employment Situation,August2026, **September4,2026** | Household survey unemployment rate; official archivedPDF |
| [CPI] | BLS CPI,August2026, **September11,2026** | Summary/TableA; airline fares detail |
| [PCE] | BEA Personal Income and Outlays,July2026, **August26,2026** | Nominal/realPCE monthly changes |
| [FOMC] | Federal Reserve policy statement, **September16,2026** | Target-range decision |
| [FEDC] | Federal Reserve commercial-bank charge-off rates, updated **August25,2026** | Credit cards; seasonally adjusted annual rates,Q2 2026/Q2 2025 |
| [UST10] / [UST2] | FRED DGS10 / DGS2, observations **September21,2026**, updatedSeptember22 | Daily Treasury constant-maturity yields, percent |
| [USD] | FRED DTWEXBGS, observation **September18,2026**, updatedSeptember21 | Broad dollar index,January2006=100,NSA |
| [PX] | Stock Analysis AXP overview/statistics, updated **September22,2026**, retrievedSeptember23 | Close, moving averages, RSI, average volume/range; AXP fundamental fields rejected where conflicting |
| [PX2] | FinanceCharts AXP price history, **September22,2026 observation**, retrievedSeptember23 | Closing-price corroboration; conflicting volume |
| [PX3] | Investing.com AXP historical data, **September22,2026 observation**, retrievedSeptember23 | Price/volume comparison |
| [PH] | Stock Analysis AXP historical ratios, fiscal2021–25, checked **September22,2026** | Fiscal-year-end vendor P/E; methodology limitations disclosed |
| [PV] / [PMA] / [PCOF] / [PJPM] | Stock Analysis peer statistics, **September22,2026 close context**, retrievedSeptember23 | Vendor industry-comparison P/E/PB/yield; Visa/MA TTMROE |
| [SPX] | INDmoney market context, updated **September22,2026** | Table citing FactSetSeptember18 forward12-month marketP/E; secondary attribution only |

[K21]: https://www.sec.gov/Archives/edgar/data/4962/000000496222000008/axp-20211231.htm
[K22]: https://www.sec.gov/Archives/edgar/data/4962/000000496223000006/axp-20221231.htm
[K23]: https://www.sec.gov/Archives/edgar/data/4962/000000496224000013/axp-20231231.htm
[K25]: https://www.sec.gov/Archives/edgar/data/4962/000000496226000080/axp-20251231.htm
[Q26]: https://www.sec.gov/Archives/edgar/data/4962/000000496226000322/axp-20260630.htm
[E26]: https://www.sec.gov/Archives/edgar/data/4962/000000496226000318/q226exhibit991.htm
[E25]: https://d18rn0p25nwr6d.cloudfront.net/CIK-0000004962/c7ec26e4-6af0-43c4-bb6f-f7960cc7594c.pdf
[E24]: https://www.sec.gov/Archives/edgar/data/4962/000000496225000007/q424exhibit991.htm
[E23]: https://www.sec.gov/Archives/edgar/data/4962/000000496224000008/q423exhibit991.htm
[E22]: https://ir.americanexpress.com/news/investor-relations-news/investor-relations-news-details/2023/American-Express-Delivers-on-2022-Growth-Plan-With-Full-Year-Revenue-Growth-of-25-and-Earnings-Per-Share-of-9.85/default.aspx
[AR25]: https://s26.q4cdn.com/747928648/files/doc_financials/2025/ar/American-Express-Annual-Report-2025.pdf
[P26]: https://www.sec.gov/Archives/edgar/data/4962/000110465926034163/tm2519434-8_def14a.htm
[M8]: https://www.sec.gov/Archives/edgar/data/4962/000000496226000353/axp-20260915.htm
[PREF]: https://www.sec.gov/Archives/edgar/data/4962/000000496226000338/axp-20260812.htm
[F4]: https://www.sec.gov/Archives/edgar/data/4962/000000496226000348/xslF345X06/form4.xml
[FORK]: https://ir.americanexpress.com/news/investor-relations-news/investor-relations-news-details/2026/American-Express-Announces-Proposed-Acquisition-of-TheFork-a-Leading-European-Restaurant-Booking-Platform/default.aspx
[T]: https://ir.americanexpress.com/events/event-details/2026/Q2-2026-American-Express-Earnings-Conference-Call/default.aspx
[V26]: https://www.sec.gov/Archives/edgar/data/1403161/000140316126000103/q32026earningsrelease.htm
[MA26]: https://www.sec.gov/Archives/edgar/data/1141391/000114139126000081/ma06302026-exx991xearnings.htm
[COF26]: https://www.sec.gov/Archives/edgar/data/927628/000092762826000083/ex992q22026earningsrelease.htm
[COFD]: https://www.capitalone.com/about/newsroom/capital-one-completes-acquisition-of-discover/
[JPM26]: https://www.sec.gov/Archives/edgar/data/19617/000162828026048078/a2q26erfexhibit991narrative.htm
[GDP]: https://www.bea.gov/news/2026/gdp-second-estimate-and-corporate-profits-2nd-quarter-2026
[JOBS]: https://www.dol.gov/newsroom/economicdata/empsit_09042026.pdf
[CPI]: https://www.bls.gov/news.release/archives/cpi_09112026.htm
[PCE]: https://www.bea.gov/news/2026/personal-income-and-outlays-july-2026
[FOMC]: https://www.federalreserve.gov/newsevents/pressreleases/monetary20260916a.htm
[FEDC]: https://www.federalreserve.gov/releases/chargeoff/chgallsa.htm
[UST10]: https://fred.stlouisfed.org/series/DGS10
[UST2]: https://fred.stlouisfed.org/series/DGS2
[USD]: https://fred.stlouisfed.org/series/DTWEXBGS
[PX]: https://stockanalysis.com/stocks/axp/statistics/
[PX2]: https://www.financecharts.com/stocks/AXP/summary/price
[PX3]: https://www.investing.com/equities/american-express-historical-data
[PH]: https://stockanalysis.com/stocks/axp/financials/ratios/
[PV]: https://stockanalysis.com/stocks/v/statistics/
[PMA]: https://stockanalysis.com/stocks/ma/statistics/
[PCOF]: https://stockanalysis.com/stocks/cof/statistics/
[PJPM]: https://stockanalysis.com/stocks/jpm/statistics/
[SPX]: https://www.indmoney.com/blog/us-stocks/nasdaq-record-high-michael-burry-ai-bubble
