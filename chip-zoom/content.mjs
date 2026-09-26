// หนึ่งชิป ห้าด่าน — เนื้อหา · ตัวเลขทุกตัวมาจากงบ/เอกสารทางการที่ลิงก์ไว้ใน SRC (ดึงเมื่อ ก.ย. 2026)

// ด่าน = ช่วงขนาดภาพ (เมตร) ที่ใครเก็บเงิน · stop = มุมกล้องหลักของด่าน
export const GATES = [
  {
    id: 1, key: 'cloud', co: 'Hyperscaler', tick: 'MSFT · GOOGL · AMZN · META', color: '#7fb2ff',
    from: Infinity, to: 1.2, stop: 10,
    head: 'เงินทุกบาทเริ่มไหลจากตรงนี้',
    body: 'บริษัทคลาวด์ซื้อที่ดิน ไฟฟ้า ระบบน้ำเย็น และตู้ GPU ทั้งตู้ แล้วขายเวลาประมวลผลต่อเป็นรายชั่วโมง ทุกด่านที่อยู่ลึกลงไปได้เงินจากเช็คใบนี้',
    stats: [
      { k: 'Microsoft ลงทุนสินทรัพย์ถาวร ปีงบ 2025', v: '$64.6B' },
      { k: 'รายได้ Microsoft Cloud', v: '$168.9B' },
      { k: 'Gross margin Microsoft Cloud', v: '69%', gm: 69 },
    ],
    note: 'Microsoft เขียนเองในงบว่า margin ลดลง “driven by the impact of scaling our AI infrastructure”',
    src: 'msft',
  },
  {
    id: 2, key: 'nvda', co: 'NVIDIA', tick: 'NVDA', color: '#3ddc97',
    from: 1.2, to: 0.06, stop: 0.55,
    head: 'ไม่ได้ขายแค่ชิป แต่ขายทั้งตู้',
    body: 'GB200 NVL72 หนึ่งตู้มี GPU Blackwell 72 ตัวกับ CPU Grace 36 ตัว ต่อกันด้วย NVLink และระบายความร้อนด้วยของเหลว ถาดที่ดึงออกมามี CPU 2 ตัวกับ GPU 4 ตัว',
    stats: [
      { k: 'รายได้ ปีงบ 2026', v: '$215.9B' },
      { k: 'Data Center', v: '$193.7B', sub: '90% ของรายได้' },
      { k: 'Gross margin', v: '71.1%', gm: 71.1 },
    ],
    note: 'Margin ลดจาก 75.0% เพราะเปลี่ยนจากขาย Hopper HGX ไปขาย Blackwell แบบทั้งระบบ และมีค่าใช้จ่ายสต็อก H20 อีก $4.5B',
    src: 'nvda',
  },
  {
    id: 3, key: 'tsmc', co: 'TSMC', tick: 'TSM', color: '#f5b544',
    from: 0.06, to: 0.006, stop: 0.075,
    head: 'โรงงานที่พิมพ์ชิปนี้ออกมาจริง',
    body: 'GPU หนึ่งตัวคือได 2 ชิ้นที่ใหญ่เกือบเท่าที่เครื่องพิมพ์จะพิมพ์ได้ ต่อกันด้วยลิงก์ 10 TB/s รวม 208,000 ล้านทรานซิสเตอร์ ผลิตด้วยกระบวนการ 4NP ของ TSMC แล้ววางคู่กับหน่วยความจำ HBM บนแผ่นรองซิลิคอนผืนเดียว',
    stats: [
      { k: 'รายได้ ปี 2025', v: '$121.4B' },
      { k: 'HPC (รวม AI)', v: '58%', sub: 'ของรายได้' },
      { k: 'Gross margin', v: '59.9%', gm: 59.9 },
    ],
    note: 'ลูกค้า 10 รายแรก = 78% ของรายได้ · ใช้เงินลงทุน (capex) ราว 33% ของรายได้ทุกปี',
    src: 'tsm',
  },
  {
    id: 4, key: 'eda', co: 'Synopsys · Cadence', tick: 'SNPS · CDNS', color: '#52d6e8',
    from: 0.006, to: 8e-7, stop: 0.0045,
    head: 'ไม่มีใครวาง 208,000 ล้านชิ้นด้วยมือ',
    body: 'ทุกบล็อก ทุกแถวเซลล์ ทุกเส้นทองแดงที่เห็นตรงนี้ ถูกสังเคราะห์ วางตำแหน่ง เดินสาย และตรวจสอบด้วยซอฟต์แวร์ออกแบบชิป (EDA) ก่อนจะมีเวเฟอร์แผ่นแรก ผู้เล่นหลักมีไม่กี่ราย และสองรายใหญ่คือ Synopsys กับ Cadence',
    stats: [
      { k: 'รายได้ Synopsys ปีงบ 2025', v: '$7.05B' },
      { k: 'Gross margin Synopsys', v: '77.0%', gm: 77.0 },
      { k: 'Gross margin Cadence', v: '86.4%', gm: 86.4 },
    ],
    note: 'ด่านที่รายได้เล็กที่สุดในห้าด่าน แต่ margin สูงที่สุด · Synopsys ใช้เงินวิจัย $2.48B หรือ 35% ของรายได้ (GM 81.4% ถ้าไม่นับค่าตัดจำหน่ายจากดีล Ansys)',
    src: 'eda',
  },
  {
    id: 5, key: 'asml', co: 'ASML', tick: 'ASML', color: '#b18cff',
    from: 8e-7, to: 1.4e-8, stop: 3e-7,
    head: 'ไม้บรรทัดที่เล็กที่สุดในโลก',
    body: 'ชั้นที่ละเอียดที่สุดของทรานซิสเตอร์พิมพ์ด้วยแสง EUV ความยาวคลื่น 13.5 นาโนเมตร (แถบสีม่วงในภาพ) ASML บอกเองว่าเทคโนโลยีนี้ “unique to ASML” และเป็นบริษัทเดียวที่พัฒนาเครื่องได้จนใช้งานจริง',
    stats: [
      { k: 'ยอดขาย ปี 2025', v: '€32.7B' },
      { k: 'เครื่อง EUV 48 เครื่อง', v: '€11.6B', sub: 'เฉลี่ยราว €240M ต่อเครื่อง' },
      { k: 'Gross margin', v: '52.8%', gm: 52.8 },
    ],
    note: 'ยอดสั่งซื้อที่ยังไม่ได้ส่ง (backlog) สิ้นปี 2025 = €38.8B',
    src: 'asml',
  },
  {
    id: 6, key: 'phys', co: 'ฟิสิกส์', tick: 'ไม่มีเจ้าของ', color: '#dfe7e3',
    from: 1.4e-8, to: 0, stop: 4e-9,
    head: 'ด่านที่ไม่มีใครเก็บเงิน',
    body: 'อะตอมซิลิคอนเรียงเป็นผลึก ห่างกัน 0.235 นาโนเมตร ครีบที่กระแสไหลผ่านกว้าง 6 นาโนเมตร หรือแค่ไม่กี่สิบอะตอม ตรงนี้ไม่มีใครผูกขาด มีแต่กำแพงที่ทุกบริษัทต้องชนเหมือนกัน',
    stats: [
      { k: 'ระยะระหว่างอะตอม Si–Si', v: '0.235 nm' },
      { k: 'ความยาวคลื่น EUV', v: '13.5 nm', sub: 'ยาวกว่าระยะอะตอม ~57 เท่า' },
    ],
    note: 'ยิ่งทรานซิสเตอร์เล็กลงใกล้ขนาดอะตอม ต้นทุนของทุกด่านข้างบนยิ่งแพงขึ้น',
    src: null,
  },
];

// คำอธิบายว่ากำลังดูอะไร (ตามชั้นของโลก 3D)
export const LAYERS = [
  { key: 'hall', en: 'AI DATA HALL', th: 'ห้องเซิร์ฟเวอร์ AI · ตู้ GB200 NVL72 เรียงเป็นแถว ระบายความร้อนด้วยน้ำ', from: Infinity, to: 1.2 },
  { key: 'tray', en: 'COMPUTE TRAY', th: 'ถาดคอมพิวต์ 1 ถาด · CPU 2 + GPU 4 ใต้แผ่นระบายความร้อน', from: 1.2, to: 0.12 },
  { key: 'package', en: 'ONE GPU PACKAGE', th: 'GPU 1 ตัว · ได 2 ชิ้น + HBM 8 กอง บนแผ่นรองซิลิคอนผืนเดียว', from: 0.12, to: 0.04 },
  { key: 'die', en: 'ONE DIE', th: 'ได 1 ชิ้น · บล็อกซ้ำๆ คือหน่วยประมวลผล SM', from: 0.04, to: 0.008 },
  { key: 'sm', en: 'STREAMING MULTIPROCESSOR', th: 'SM หนึ่งหน่วย · Tensor Core, หน่วยความจำ SRAM, ตัวจัดคิวงาน', from: 0.008, to: 1.1e-4 },
  { key: 'cells', en: 'COPPER, LAYER BY LAYER', th: 'ขุดชั้นสายทองแดงออกทีละชั้น จนถึงแถวเซลล์ที่ก้นชิป', from: 1.1e-4, to: 9e-7 },
  { key: 'transistor', en: 'ONE FinFET, CUT OPEN', th: 'ผ่าทรานซิสเตอร์ · เกตคร่อมครีบซิลิคอน 3 ด้าน', from: 9e-7, to: 1.6e-8 },
  { key: 'atoms', en: 'SILICON LATTICE', th: 'ผลึกซิลิคอนในครีบ · ขอบสองข้างคือฉนวนเกต HfO₂ ที่ไม่เป็นผลึก', from: 1.6e-8, to: 0 },
];

// เทียบขนาดกับของใกล้ตัว
export const COMPARE = [
  { m: 105, t: 'สนามฟุตบอล' }, { m: 12, t: 'รถเมล์' }, { m: 1.7, t: 'คน' },
  { m: 0.0856, t: 'บัตรเครดิต' }, { m: 0.02, t: 'เหรียญบาท' }, { m: 0.0005, t: 'เม็ดทราย' },
  { m: 7e-5, t: 'เส้นผม' }, { m: 7.5e-6, t: 'เม็ดเลือดแดง' }, { m: 2e-6, t: 'แบคทีเรีย' },
  { m: 1e-7, t: 'ไวรัสโควิด' }, { m: 1.35e-8, t: 'คลื่นแสง EUV' }, { m: 2e-9, t: 'เกลียว DNA' },
  { m: 2.35e-10, t: 'ระยะอะตอม Si' },
];

// จุดหยุดของโหมดเล่นอัตโนมัติ (เมตร, วินาทีที่ค้าง)
export const TOUR = [
  [10, 2.4], [0.55, 2.6], [0.075, 2.6], [0.028, 2.2], [0.0045, 2.6], [0.0006, 1.2],
  [6e-5, 1.2], [7e-6, 2.6], [3e-7, 3.0], [4e-8, 1.4], [4e-9, 3.2],
];

export const SUMMARY = {
  head: 'ซูมกลับออกมา: ห้าด่านนี้ขายของให้กองเดียวกัน',
  body: 'ตู้ AI หนึ่งตู้คือเงินที่ไหลผ่านทุกด่าน แต่แต่ละด่านผูกกับ AI ไม่เท่ากัน ยิ่งลึกลงไป ลูกค้ายิ่งหลากหลาย เพราะเครื่องมือออกแบบกับเครื่องพิมพ์ต้องใช้กับชิปทุกประเภท ไม่ใช่แค่ชิป AI',
  rows: [
    { g: 1, co: 'Microsoft Cloud', gm: 69, ai: 'ผู้จ่าย (capex $64.6B)' },
    { g: 2, co: 'NVIDIA', gm: 71.1, ai: 'Data Center 90% ของรายได้' },
    { g: 3, co: 'TSMC', gm: 59.9, ai: 'HPC รวม AI 58% ของรายได้' },
    { g: 4, co: 'Synopsys', gm: 77.0, ai: 'ขายให้ชิปทุกชนิด (งบไม่แยก AI)' },
    { g: 4, co: 'Cadence', gm: 86.4, ai: 'ขายให้ชิปทุกชนิด (งบไม่แยก AI)' },
    { g: 5, co: 'ASML', gm: 52.8, ai: 'ขายให้ชิปทุกชนิด (งบไม่แยก AI)' },
  ],
  watch: 'สัญญาณที่ต้องเฝ้า: เงินลงทุนของบริษัทคลาวด์ (บรรทัด “Additions to property and equipment” ในงบกระแสเงินสด) ถ้าบรรทัดนี้หยุดโต ด่านที่ผูกกับ AI มากที่สุดจะรู้สึกก่อน',
  caveat: 'Gross margin วัดคนละแบบในแต่ละบริษัท (Microsoft Cloud = ส่วนงาน, บริษัทอื่น = ทั้งบริษัท) จึงเทียบกันได้คร่าวๆ เท่านั้น',
};

export const SRC = {
  msft: { t: 'Microsoft Form 10-K ปีงบ 2025 (สิ้นสุด 30 มิ.ย. 2025)', u: 'https://www.sec.gov/Archives/edgar/data/789019/000095017025100235/msft-20250630.htm' },
  nvda: { t: 'NVIDIA Form 10-K ปีงบ 2026 (สิ้นสุด 25 ม.ค. 2026)', u: 'https://www.sec.gov/Archives/edgar/data/1045810/000104581026000021/nvda-20260125.htm' },
  blackwell: { t: 'NVIDIA Newsroom: Blackwell Platform Arrives (208B ทรานซิสเตอร์, 4NP, 10 TB/s, GB200 NVL72)', u: 'https://nvidianews.nvidia.com/news/nvidia-blackwell-platform-arrives-to-power-a-new-era-of-computing' },
  tsm: { t: 'TSMC Form 20-F ปี 2025', u: 'https://investor.tsmc.com/english/annual-reports' },
  snps: { t: 'Synopsys Form 10-K ปีงบ 2025 (สิ้นสุด 31 ต.ค. 2025)', u: 'https://www.sec.gov/Archives/edgar/data/883241/000088324125000028/snps-20251031.htm' },
  cdns: { t: 'Cadence Form 10-K ปี 2025', u: 'https://www.sec.gov/Archives/edgar/data/813672/000081367226000016/cdns-20251231.htm' },
  asml: { t: 'ASML ผลประกอบการปี 2025 (ม.ค. 2026)', u: 'https://www.asml.com/en/investors' },
  euv: { t: 'ASML: EUV lithography systems (ความยาวคลื่น 13.5 nm)', u: 'https://www.asml.com/en/products/euv-lithography-systems' },
};
SRC.eda = SRC.snps;
export const SRC_ORDER = ['msft', 'nvda', 'blackwell', 'tsm', 'snps', 'cdns', 'asml', 'euv'];
