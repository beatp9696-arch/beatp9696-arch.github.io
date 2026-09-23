"""AXP research calculations, information cutoff 2026-09-23.

Run: python3 model.py
Writes only derived research artifacts alongside this script.
USD millions unless a metric's unit says otherwise. No external dependencies.
Historical inputs transcribed from original filings; forecasts are assumptions.
"""
from pathlib import Path
import csv
import json

ROOT = Path(__file__).resolve().parent
SOURCES = {
    "K21": ["2021 Form 10-K", "2022-02-11", "https://www.sec.gov/Archives/edgar/data/4962/000000496222000008/axp-20211231.htm"],
    "K22": ["2022 Form 10-K", "2023-02-10", "https://www.sec.gov/Archives/edgar/data/4962/000000496223000006/axp-20221231.htm"],
    "K23": ["2023 Form 10-K", "2024-02-09", "https://www.sec.gov/Archives/edgar/data/4962/000000496224000013/axp-20231231.htm"],
    "K25": ["2025 Form 10-K", "2026-02-06", "https://www.sec.gov/Archives/edgar/data/4962/000000496226000080/axp-20251231.htm"],
    "Q26": ["Q2 2026 Form 10-Q", "2026-07-24", "https://www.sec.gov/Archives/edgar/data/4962/000000496226000322/axp-20260630.htm"],
}
YEARS = list(range(2020, 2026))
# metric: (unit, section, 2020..2025)
DATA = {
    "Revenue net of interest expense": ("USD m", "Consolidated Statements of Income", [36087,42380,52862,60515,65949,72229]),
    "Non-interest revenue": ("USD m", "Consolidated Statements of Income; presentation recast", [28102,34630,42967,47381,50406,54865]),
    "Net interest income": ("USD m", "Consolidated Statements of Income", [7985,7750,9895,13134,15543,17364]),
    "Provision for credit losses": ("USD m", "Consolidated Statements of Income", [4730,-1419,2182,4923,5185,5256]),
    "Total expenses": ("USD m", "Consolidated Statements of Income", [27061,33110,41095,45079,47869,53178]),
    "Pretax income": ("USD m", "Consolidated Statements of Income", [4296,10689,9585,10513,12895,13795]),
    "Income taxes": ("USD m", "Consolidated Statements of Income", [1161,2629,2071,2139,2766,2962]),
    "Net income": ("USD m", "Consolidated Statements of Income", [3135,8060,7514,8374,10129,10833]),
    "Diluted EPS": ("USD/share", "Consolidated Statements of Income", [3.77,10.02,9.85,11.21,14.01,15.38]),
    "Diluted average shares": ("million shares", "Consolidated Statements of Income / EPS note", [806,790,752,736,713,696]),
    "Common dividends declared per share": ("USD/share", "Consolidated Statements of Shareholders' Equity", [1.72,1.72,2.08,2.40,2.80,3.28]),
    "Reported ROE": ("%", "MD&A, Summary of Financial Performance", [14.2,33.7,32.3,31.5,34.6,33.9]),
    "Effective tax rate": ("%", "MD&A, Summary of Financial Performance", [27.0,24.6,21.6,20.3,21.5,21.5]),
    "CET1 ratio": ("%", "MD&A, Capital Management / Regulatory Matters", [13.5,10.5,10.3,10.5,10.5,10.5]),
    "Cash and cash equivalents": ("USD m", "Consolidated Balance Sheets", [32965,22028,33914,46596,40640,47792]),
    "Customer deposits": ("USD m", "Consolidated Balance Sheets", [86875,84382,110239,129144,139413,152488]),
    "Long-term debt": ("USD m", "Consolidated Balance Sheets", [42952,38675,42573,47866,49715,56387]),
    "Card Member loans gross": ("USD m", "Consolidated Balance Sheets / Loans note", [73373,88562,107964,125995,139674,151832]),
    "Card Member receivables gross": ("USD m", "Consolidated Balance Sheets / Loans note", [43701,53645,57613,60411,59411,62031]),
    "Total Card Member loans and receivables gross": ("USD m", "Selected Credit-Related Statistical Information; calculated sum of reported loan and receivable balances", [117074,142207,165577,186406,199085,213863]),
    "Card loan past due consumer and SME": ("USD m", "Loans and Card Member Receivables Aging; calculated sum of disclosed 30–59, 60–89 and 90+ buckets", [None,597,1078,1721,1972,2117]),
    "Card receivable past due consumer and SME": ("USD m", "Loans and Card Member Receivables Aging; calculated sum of disclosed 30–59, 60–89 and 90+ buckets", [None,244,550,489,395,418]),
    "Total assets EOY": ("USD m", "Consolidated Balance Sheets", [191367,188548,228354,261108,271461,300052]),
    "Average total assets": ("USD m", "Statistical Disclosure / Average Balance Sheet", [190079,189593,205479,242417,268012,291886]),
    "Shareholders' equity EOY": ("USD m", "Consolidated Balance Sheets", [22984,22177,24711,28057,30264,33474]),
    "Common shares EOY rounded": ("million shares", "Consolidated Balance Sheets / Shareholders' Equity note", [805,761,743,723,702,686]),
    "Goodwill": ("USD m", "Other Assets / Goodwill note", [3852,3804,3786,3851,4187,4872]),
    "Amortized intangible assets net": ("USD m", "Other Assets / Goodwill note", [265,201,146,98,123,90]),
    "Operating cash flow": ("USD m", "Consolidated Statements of Cash Flows", [5591,14645,21079,18559,14050,18428]),
    "Purchases premises and equipment net of sales": ("USD m outflow", "Consolidated Statements of Cash Flows", [1478,1550,1855,1563,1911,2425]),
    "Cash flow repurchases and other": ("USD m outflow", "Consolidated Statements of Cash Flows; not pure program repurchases", [1029,7652,3502,3650,6020,5814]),
    "Cash flow dividends paid incl preferred": ("USD m outflow", "Consolidated Statements of Cash Flows", [1474,1448,1565,1780,1999,2271]),
    "Network volumes": ("USD bn", "MD&A, Selected Statistical Information", [1037.8,1284.2,1552.8,1680.1,1764.8,1897.0]),
    "Billed business / proprietary Card Member spending": ("USD bn", "MD&A, Selected Statistical Information", [870.7,1089.8,1338.3,1459.6,1550.9,1669.8]),
    "Total cards in force": ("million cards", "MD&A, Selected Statistical Information", [112.0,121.7,133.3,141.2,146.5,152.8]),
    "Proprietary cards in force": ("million cards", "MD&A, Selected Statistical Information", [68.9,71.4,76.7,80.2,83.6,86.6]),
    "Proprietary basic cards in force": ("million cards", "MD&A, Selected Statistical Information", [52.7,54.7,59.1,61.7,64.3,66.7]),
    "Average proprietary basic Card Member spending": ("USD/card/year", "MD&A, Selected Statistical Information; company definition", [16352,20392,23496,24059,24608,25453]),
    "Discount revenue": ("USD m", "MD&A, Revenue / Consolidated Statements of Income; recast", [19435,24563,30739,33416,35192,37401]),
    "Average discount rate legacy": ("%", "MD&A, Selected Statistical Information; NOT discount revenue/billings", [2.28,2.30,2.34,None,None,None]),
    "Discount revenue divided by billed business reported": ("%", "MD&A, Selected Statistical Information; rounded company metric", [None,None,None,2.29,2.27,2.24]),
    "Net card fees": ("USD m", "Consolidated Statements of Income", [4664,5195,6070,7255,8449,9993]),
    "Net interest yield legacy adjusted loan-only": ("%", "MD&A, Selected Statistical Information; NON-GAAP old definition", [11.5,10.7,10.6,None,None,None]),
    "Net interest yield GAAP all loans and receivables": ("%", "K25 MD&A Table 1; recast 2023-2025", [None,None,None,7.3,7.9,8.1]),
    "Card Member rewards expense": ("USD m", "Consolidated Statements of Income / Expenses summary", [8041,11007,14002,15367,16599,18409]),
    "Business development expense": ("USD m", "Consolidated Statements of Income / Expenses summary", [3051,3762,4943,5657,5886,6457]),
    "Card Member services expense": ("USD m", "Consolidated Statements of Income / Expenses summary", [1230,1993,2959,3968,4782,6057]),
    "Marketing expense": ("USD m", "Consolidated Statements of Income / Expenses summary; recast", [3696,5291,5458,5213,6040,6252]),
    "Card loan reserve": ("USD m", "MD&A, Selected Statistical Information / Credit Reserves note", [5344,3305,3747,5118,5679,5909]),
    "Card loan reserve coverage": ("%", "MD&A, Selected Statistical Information", [7.3,3.7,3.5,4.1,4.1,3.9]),
    "Card loan net write-off principal-only": ("% annual rate", "MD&A, Selected Statistical Information", [2.4,.9,.9,1.8,2.2,2.2]),
    "Card loan net write-off incl interest and fees": ("% annual rate", "MD&A, Selected Statistical Information", [2.9,1.2,1.1,2.2,2.7,2.7]),
    "Card loan 30-plus-day delinquency": ("% EOY", "MD&A, Selected Statistical Information", [1.0,.7,1.0,1.4,1.4,1.4]),
    "Card receivable reserve": ("USD m", "MD&A, Selected Statistical Information / Credit Reserves note", [267,64,229,174,171,180]),
    "Card receivable net write-off incl fees": ("% annual rate", "MD&A, Selected Statistical Information", [2.0,.3,.8,1.6,1.3,1.2]),
    "New proprietary cards acquired": ("million cards", "Selected Statistical Information / annual earnings releases", [None,None,12.5,12.2,13.0,12.5]),
}
MISSING = "Data not found in the reviewed primary sources."
def val(metric, year): return DATA[metric][2][year-2020]
def source_for(metric, year):
    if year >= 2023: return "K25"
    if year == 2020 and metric not in {"Non-interest revenue", "Discount revenue", "Marketing expense", "Business development expense"}: return "K21"
    return "K22" if year >= 2020 else "K21"
def f(x, nd=2):
    return MISSING if x is None else f"{x:,.{nd}f}".rstrip("0").rstrip(".") if nd else f"{x:,.0f}"
def table(headers, rows):
    return "| " + " | ".join(headers) + " |\n| " + " | ".join(["---"]*len(headers)) + " |\n" + "\n".join("| " + " | ".join(str(c) for c in r) + " |" for r in rows) + "\n"

def historical():
    records=[]; wide=[]
    for metric,(unit,section,values) in DATA.items():
        wide.append([metric,unit]+[f(x) if x is not None else "N/F" for x in values])
        for i,(year,value) in enumerate(zip(YEARS,values)):
            src=source_for(metric,year); prior=values[i-1] if i else None
            if value is None or prior is None: change="N/A"; formula="No comparable input"
            elif unit.startswith("%"):
                change=f"{value-prior:+.2f} pp"; formula=f"{value} - {prior} percentage points"
            elif prior<=0 or value<0:
                change="NM; change "+f(value-prior); formula=f"{value} - ({prior}); percent growth not meaningful"
            else: change=f"{(value/prior-1)*100:.2f}%"; formula=f"({value}/{prior}-1)*100"
            records.append([metric,year,unit,value if value is not None else MISSING,change,formula,*SOURCES[src],section])
    with (ROOT/"historical-data.csv").open("w",newline="") as h:
        w=csv.writer(h);w.writerow(["metric","fiscal_year","unit","reported_value","calculated_yoy","yoy_formula_and_inputs","source_document","filing_date","direct_link","section"]);w.writerows(records)
    text="# Calculation workbook — AXP, cutoff 23 September 2026\n\nAll dollar values are USD. Rounding occurs only for display. `historical-data.csv` contains each fiscal year, exact reported input, its YoY calculation, source, date, and section. Rate changes are percentage points, not percentage growth. N/F means: "+MISSING+"\n\n## Historical reported input matrix\n\n"+table(["Metric","Unit"]+[str(y) for y in YEARS],wide)
    text+="\nSource assignment: 2023–2025 from K25; 2020–2022 primarily K22; K21 supplies 2020 balance-sheet/average-asset/intangible comparatives. Each filing's MD&A, statements, and notes are the controlling definitions. 2020 is supplied to calculate a genuine five-year CAGR, not a four-year CAGR mislabeled five-year.\n\n"
    derived=[];bv={};tbv={}
    for year in YEARS:
        eq=val("Shareholders' equity EOY",year);sh=val("Common shares EOY rounded",year)
        gw=val("Goodwill",year);ia=val("Amortized intangible assets net",year)
        bv[year]=(eq-1584)/sh;tbv[year]=(eq-1584-gw-ia)/sh
        ni=val("Net income",year);assets=val("Average total assets",year)
        derived.append([year,f(bv[year]),f"({eq}-1584)/{sh}",f(tbv[year]),f"({eq}-1584-{gw}-{ia})/{sh}",f(ni/assets*100)+"%",f"{ni}/{assets}*100"])
    text+="## Book value, tangible book value, ROA (calculated)\n\nPreferred carrying capital is USD 1,584m, not USD 1,600m liquidation preference. For 2020 the carrying amount is reconstructed as the USD 1,600m redeemed in 2021 less its USD 16m redemption/carrying-value difference (K21, Notes 16 and 21). TBV deducts goodwill and amortized intangibles without a deferred-tax adjustment; it is an analyst definition, not regulatory CET1. Shares are reported rounded period-end shares, so derived per-share book values are not exact to the cent.\n\n"+table(["Year","Common BV/share USD","Inputs/formula","TBV/share USD","Inputs/formula","ROA","Inputs/formula"],derived)
    cagr=[]
    for metric in ["Revenue net of interest expense","Net income","Diluted EPS","Common dividends declared per share","Common BV/share"]:
        series=bv if metric=="Common BV/share" else {y:val(metric,y) for y in YEARS}
        for n in [3,5]:
            a=series[2025-n];b=series[2025];cagr.append([metric,f"{2025-n}–2025",f((b/a)**(1/n)*100-100)+"%",f"({b:.10g}/{a:.10g})^(1/{n})-1"])
    text+="\n## CAGR calculations\n\n"+table(["Metric","Period","Calculated CAGR","Exact-input formula (BV ratios shown above)"],cagr)
    return text,bv

FLOW = {
    # FY25, H1 26, H1 25, Q2 26, Q2 25
    "Revenue net of interest expense":[72229,38544,34823,19637,17856],
    "Non-interest revenue":[54865,29203,26467,14988,13669],
    "Net interest income":[17364,9341,8356,4649,4187],
    "Discount revenue":[37401,19675,18104,10163,9361],
    "Net card fees":[9993,5614,4813,2862,2480],
    "Service fees and other revenue":[7471,3914,3550,1963,1828],
    "Provision for credit losses":[5256,2336,2555,1084,1405],
    "Total expenses":[53178,28359,25388,14482,12901],
    "Pretax income":[13795,7849,6880,4071,3550],
    "Income taxes":[2962,1767,1411,961,665],
    "Net income":[10833,6082,5469,3110,2885],
    "Diluted EPS":[15.38,8.81,7.71,4.53,4.08],
    "Billed business USD bn":[1669.8,883.8,803.7,455.8,416.3],
    "Rewards expense":[18409,9942,8996,5051,4618],
    "Card Member services expense":[6057,3924,2629,1949,1301],
    "Marketing expense":[6252,3130,3041,1650,1555],
    "Operating cash flow":[18428,9175,9128,None,None],
    "Net purchases premises/equipment":[2425,2047,1049,None,None],
}

VALUATION = {
    "Bear":dict(eps=14,pe=14,earnings_growth=.04,roe=.24,k=.12,g=.03),
    "Base":dict(eps=17.2,pe=19,earnings_growth=.10,roe=.32,k=.105,g=.05),
    "Bull":dict(eps=18,pe=23,earnings_growth=.13,roe=.36,k=.095,g=.06),
}
SCENARIOS = {
    "Bear":dict(bill=.03,fee=.06,bal=.04,svc=.03,yield_=.076,nco=.04,cov=.035,expense=[.745,.7425,.74,.7375,.735],tax=.25,buy=.005,div=.03,exit=14),
    "Base":dict(bill=.08,fee=.12,bal=.08,svc=.08,yield_=.081,nco=.024,cov=.027,expense=[.735,.7325,.73,.7275,.725],tax=.235,buy=.02,div=.10,exit=16),
    "Bull":dict(bill=.11,fee=.16,bal=.10,svc=.11,yield_=.084,nco=.02,cov=.025,expense=[.73,.725,.72,.715,.71],tax=.225,buy=.025,div=.13,exit=20),
}
PRICE=305.07
B0=34280-1584
SHARES=675
RETENTION=.25

def ri_model(p,detail=False):
    b=B0;e=p["eps"]*SHARES;v=b;rows=[]
    for t in range(1,6):
        e*=1+p["earnings_growth"];ri=e-p["k"]*b;end=b+RETENTION*e
        v+=ri/(1+p["k"])**t;rows.append([t,e,b,ri,end]);b=end
    tv=(p["roe"]-p["k"])*b/(p["k"]-p["g"])
    out=(v+tv/(1+p["k"])**5)/SHARES
    return (out,rows,tv) if detail else out

def scenario(p):
    bill=1749.9;fee=10794;svc=7835;bal=218054;allbal=231233;shares=675;cov=.027;rows=[]
    for t in range(1,6):
        end=bal*(1+p["bal"]);avg=(bal+end)/2
        endall=allbal*(1+p["bal"]);avgall=(allbal+endall)/2
        bill*=1+p["bill"];fee*=1+p["fee"];svc*=1+p["svc"]
        discount=bill*1000*(38972/1749900);nii=avgall*p["yield_"]
        revenue=discount+fee+svc+nii
        reservebuild=p["cov"]*end-cov*bal
        provision=avg*p["nco"]+reservebuild+400*(1+p["bal"])**t
        expenses=revenue*p["expense"][t-1];pretax=revenue-expenses-provision;ni=pretax*(1-p["tax"])
        endshares=shares*(1-p["buy"]);avgshares=(shares+endshares)/2
        eps=(ni*.993-103.2)/avgshares;dps=3.8*(1+p["div"])**t
        buyback=(shares-endshares)*eps*p["exit"]
        rows.append(dict(year=t,revenue=revenue,billings=bill,fees=fee,card_balances=end,all_balances=endall,nii=nii,net_interest_yield=p["yield_"],net_writeoff_rate=p["nco"],provision=provision,reserve_build=reservebuild,expenses=expenses,pretax=pretax,tax_rate=p["tax"],net_income=ni,repurchases=buyback,diluted_shares=avgshares,eps=eps,dps=dps))
        bal=end;allbal=endall;shares=endshares;cov=p["cov"]
    terminal=rows[-1]["eps"]*p["exit"]
    def pv(r):return sum(row["dps"]/(1+r)**row["year"] for row in rows)+terminal/(1+r)**5
    lo,hi=-.8,1
    for _ in range(150):
        mid=(lo+hi)/2
        if pv(mid)>PRICE:lo=mid
        else:hi=mid
    return dict(rows=rows,terminal=terminal,dividends=sum(r["dps"] for r in rows),irr=(lo+hi)/2,target_prices={str(r):pv(r) for r in [.08,.10,.12,.15]})

def main():
    text,bv=historical()
    ttm={k:v[0]+v[1]-v[2] for k,v in FLOW.items()}
    text+="\n## Latest quarter and TTM\n\nQ2/H1 reported inputs: Q26, filed 24 July 2026, MD&A and consolidated statements. FY2025: K25. TTM ends 30 June 2026, calculated FY2025 + H1 2026 − H1 2025; it is not a quarterly annualization. USD m except EPS USD/share and billed business USD bn. TTM EPS is the sum of period EPS, not a new weighted-share GAAP EPS calculation.\n\n"
    text+=table(["Metric","Q2 2026","Q2 2025","YoY calculated/formula","H1 2026","H1 2025","TTM","TTM formula"],[[k,f(v[3]),f(v[4]),f"({v[3]}/{v[4]}-1) = {f((v[3]/v[4]-1)*100)}%" if v[3] is not None else "N/A",f(v[1]),f(v[2]),f(ttm[k]),f"{v[0]}+{v[1]}-{v[2]}"] for k,v in FLOW.items()])
    text+="\n## Valuation: all forward inputs are analyst assumptions\n\nBook anchor = (USD 34,280m June equity − USD 1,584m preferred carrying value) / 675m June common shares = USD "+f(B0/SHARES)+" per common share. Preferred capital held constant; clean-surplus assumption excludes future OCI/acquisition accounting changes.\n\n"
    results={};vr=[]
    for name,p in VALUATION.items():
        ri,rows,tv=ri_model(p,True)
        pe=p["eps"]*p["pe"];pb=(p["roe"]-p["g"])/(p["k"]-p["g"])*B0/SHARES
        fair=.4*pe+.2*pb+.4*ri
        results[name]=dict(pe=pe,pb=pb,ri=ri,fair=fair,upside=fair/PRICE-1)
        vr.append([name,f(pe),f(pb),f(ri),f(fair),f((fair/PRICE-1)*100)+"%"])
        text+=f"### {name} residual-income schedule (USD m)\n\nE0 = {p['eps']} × 675 = {f(p['eps']*675)}. E(t) = E(t−1) × {1+p['earnings_growth']}; B(t) = B(t−1) + 25% × E(t); RI(t) = E(t) − {p['k']} × B(t−1).\n\n"
        text+=table(["Year","Common earnings","Opening common book","Residual income","Closing book"],[[r[0]]+[f(x) for x in r[1:]] for r in rows])
        text+=f"\nTerminal residual-income value at year 5 = ({p['roe']}−{p['k']}) × {rows[-1][-1]:.8f} / ({p['k']}−{p['g']}) = USD {f(tv)}m. V0 = [32,696 + Σ RI(t)/(1+{p['k']})^t + {tv:.8f}/(1+{p['k']})^5]/675 = USD {f(ri)}/share. Terminal earnings reset to sustainable ROE × closing book; they are not year-5 earnings extrapolated indefinitely. Terminal retention = g/ROE = {f(p['g']/p['roe']*100)}%.\n\n"
    text+=table(["Case","EPS × P/E USD","Justified P/B USD","Residual income USD","40% / 20% / 40% blend USD","Vs USD305.07"],vr)
    text+="\nP/E = normalized EPS × assigned P/E. P/B value = B0/share × (sustainable ROE − perpetual growth)/(required return − perpetual growth). Blending weights are subjective, not statistically estimated; models share inputs and are not independent evidence.\n\n### Sensitivities\n\nP/E grid: normalized EPS (rows) × assigned multiple (columns). USD/share.\n\n"
    text+=table(["EPS"]+[str(p) for p in [16,18,20,22]],[[e]+[f(e*p) for p in [16,18,20,22]] for e in [15,17.2,19]])
    text+="\nP/B grid: 48.4385185185 × (32%−g)/(k−g). USD/share.\n\n"+table(["k / g","4%","5%","6%"],[[f(k*100)+"%"]+[f(B0/SHARES*(.32-g)/(k-g)) for g in [.04,.05,.06]] for k in [.095,.105,.115]])
    text+="\nResidual-income grid: base explicit schedule, terminal ROE 32%; k/g vary throughout the formula, not only terminal value. USD/share.\n\n"+table(["k / g","4%","5%","6%"],[[f(k*100)+"%"]+[f(ri_model({**VALUATION['Base'],"k":k,"g":g})) for g in [.04,.05,.06]] for k in [.095,.105,.115]])
    sr={n:scenario(p) for n,p in SCENARIOS.items()}
    text+="\n## Five-year operating/return scenarios\n\nAll entries below are ANALYST SCENARIOS, not management guidance. Years 1–5 are stylized annual investment periods ending September 2027–2031, using June 2026 TTM operating flows and June 2026 balance-sheet stocks as anchors; not fiscal-year forecasts. The intervening quarter is not modeled separately.\n\n"
    text+="Starting values: billed business USD1,749.9bn; discount revenue USD38,972m; fees USD10,794m; service/other USD7,835m; card balances USD218,054m; other-inclusive balances USD229,481m plus held-for-sale USD1,752m = USD231,233m; shares 675m; annual dividend run-rate USD0.95×4 = USD3.80. Opening reserve ratio is rounded 2.7%.\n\nFormulas (t is year): billings = prior × (1+bill growth); discount = billings × 1,000 × (38,972/1,749,900); fees/service = prior × (1+respective growth); ending balances = opening × (1+balance growth); average balances = (opening+ending)/2; NII = average all-inclusive balances × assumed yield; revenue = discount+fees+service+NII. Provision = average card balances × assumed all-in write-off rate + (ending coverage × ending card balances − opening coverage × opening card balances) + 400×(1+balance growth)^t. Total expenses = revenue × assumed expense ratio; pretax = revenue−expenses−provision; NI = pretax×(1−tax). Ending shares = opening × (1−net retirement rate); diluted average shares = midpoint of opening/ending modeled shares. EPS = [NI×(1−0.007)−103.2]/average shares. USD103.2m preferred dividends assumes Series E replaces D: 1,600×6.45%. Participating awards assumed 0.7% of NI; future dilution absorbed in net retirement assumption. Repurchase cash = shares retired × modeled EPS × exit multiple (a pricing assumption; excludes additional gross purchases to offset employee issuance). DPS = 3.80×(1+dividend growth)^t.\n\n"
    for name,result in sr.items():
        text+=f"### {name} — annual scenario schedule\n\n"
        keys=list(result["rows"][0].keys())
        text+=table(["Metric / unit"]+[f"Year {i}" for i in range(1,6)],[[k+(" USD/share" if k in ["eps","dps"] else " million shares" if k=="diluted_shares" else " USD bn" if k=="billings" else " fraction" if k in ["tax_rate","net_interest_yield","net_writeoff_rate"] else " USD m")]+[f(r[k],4 if k in ["tax_rate","net_interest_yield","net_writeoff_rate"] else 2) for r in result["rows"]] for k in keys if k!="year"])
        text+=f"\nTerminal share price = {result['rows'][-1]['eps']:.8f} × {SCENARIOS[name]['exit']} = USD {f(result['terminal'])}. Dividends = sum of annual DPS = USD {f(result['dividends'])}; cash dividend return = {result['dividends']:.8f}/305.07 = {f(result['dividends']/PRICE*100)}%. Annualized return is the IRR solving 305.07 = Σ DPS(t)/(1+r)^t + terminal price/(1+r)^5: {f(result['irr']*100)}%. No dividend reinvestment, trading costs, or investor tax; no scenario probability assigned.\n\n"
    base=results["Base"]["fair"]
    text+="## Margin of safety and target-return entry prices\n\nMargin of safety = 1−price/base intrinsic value; upside = value/price−1. Current values = 1−305.07/"+f(base)+" = "+f((1-PRICE/base)*100)+"%; "+f(base)+"/305.07−1 = "+f((base/PRICE-1)*100)+"%.\n\n"
    text+=table(["Required margin","Entry USD","Formula"],[[f(m*100)+"%",f(base*(1-m)),f"{base:.8f} × (1−{m})"] for m in [.10,.20,.25,.30]])
    text+="\nReturn-target entries use the BASE operating scenario, not the intrinsic-value blend. P(r) = Σ DPS(t)/(1+r)^t + [EPS5×16]/(1+r)^5. The rows in the base schedule are the exact cash-flow inputs.\n\n"+table(["Target annual IRR","Maximum entry USD"],[[f(float(k)*100)+"%",f(v)] for k,v in sr["Base"]["target_prices"].items()])
    text+="\n## Incremental credit-loss sensitivity (scenario, not company forecast)\n\nFreeze the Q2 2026 average Card balances of USD216,710m for one year. Incremental principal write-off rate is applied to the whole balance proxy; original reported principal metric excludes some corporate balances. Pretax loss = 216,710×Δrate; NI loss = pretax loss×(1−23.5%); EPS loss = NI loss/679m Q2 diluted shares. Reserve builds, loan growth, fees, second-order spend effects and participating-award changes are excluded.\n\n"+table(["Increase pp","Pretax reduction USDm","NI reduction USDm","EPS reduction USD"],[[f(d*100),f(216710*d),f(216710*d*.765),f(216710*d*.765/679)] for d in [.005,.01,.015]])
    text+="\n## Source register for historical calculations\n\n"+table(["ID","Document","Filing date","Direct link"],[[k,v[0],v[1],v[2]] for k,v in SOURCES.items()])
    # Arithmetic checks. Do not claim these authenticate underlying documents.
    for i,y in enumerate(YEARS):
        assert val("Non-interest revenue",y)+val("Net interest income",y)==val("Revenue net of interest expense",y)
        assert val("Revenue net of interest expense",y)-val("Provision for credit losses",y)-val("Total expenses",y)==val("Pretax income",y)
        assert val("Pretax income",y)-val("Income taxes",y)==val("Net income",y)
    assert abs(ttm["Revenue net of interest expense"]-75950)<1e-8
    assert abs(ttm["Net income"]-11446)<1e-8
    assert abs(sum(ttm[k] for k in ["Discount revenue","Net card fees","Service fees and other revenue","Net interest income"])-75950)<1e-8
    (ROOT/"calculation-workbook.md").write_text(text)
    (ROOT/"model-results.json").write_text(json.dumps(dict(valuation=results,scenarios=sr,ttm=ttm,bv=bv,valuation_assumptions=VALUATION,operating_assumptions=SCENARIOS),indent=2))
    print(json.dumps(dict(valuation=results,scenario_returns={n:{k:v for k,v in r.items() if k!='rows'} for n,r in sr.items()},cagr_bv5=(bv[2025]/bv[2020])**.2-1),indent=2))
    print("PASS: six annual income-statement identities and TTM revenue/earnings reconciliations.")

if __name__=="__main__":main()
