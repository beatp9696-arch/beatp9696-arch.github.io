// Portfolio — Matrices: The Living Thesis
//
// แท็บ Portfolio เปิดมาเป็น "สุขภาพของ thesis" ไม่ใช่ตารางน้ำหนักพอร์ตอีกต่อไป:
// ถือเพราะอะไร วันนี้ยังจริงอยู่ไหม หลักฐานล่าสุดพูดว่าอะไร และอะไรที่จะทำให้ขาย
// ของเดิม (โดนัท/CRUD/แก้ราคา) ยังอยู่ครบใน portfolio-allocation.js — เข้าผ่านปุ่ม
// "Holdings & allocation" ในหน้านี้ · ข้อมูลพอร์ตยังอยู่ในเครื่องเหมือนเดิม ไม่ขึ้น cloud
import { mountWorkspace } from "../features/living-thesis/workspace.js";
import { researchIcon } from "../core/research-store.js";

export default {
  id: "portfolio", name: "Portfolio", icon: researchIcon("activity"), defaultSize: { w: 1180, h: 820 },
  mount: mountWorkspace,
};
