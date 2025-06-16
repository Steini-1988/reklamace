import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import emailjs from "@emailjs/browser";
import { jsPDF } from "jspdf"; // npm i jspdf

// ---------------------------------------------------------
// EmailJS – bezpečné načtení ENV proměnných                 
// ---------------------------------------------------------
const safeEnv = (k, d) => {
  try {
    return import.meta?.env?.[k] || d;
  } catch {
    return d;
  }
};
const EMAILJS_SERVICE_ID = safeEnv("VITE_EMAILJS_SERVICE_ID", "SERVICE_ID");
const EMAILJS_TEMPLATE_ID = safeEnv("VITE_EMAILJS_TEMPLATE_ID", "TEMPLATE_ID");
const EMAILJS_PUBLIC_KEY  = safeEnv("VITE_EMAILJS_PUBLIC_KEY",  "PUBLIC_KEY");

// ---------------------------------------------------------
// Telefonní předvolby (výběr EU)                            
// ---------------------------------------------------------
const COUNTRY_CODES = [
  { code: "+420", label: "+420 (Česko)" },
  { code: "+421", label: "+421 (Slovensko)" },
  { code: "+43",  label: "+43 (Rakousko)" },
  { code: "+49",  label: "+49 (Německo)" },
  { code: "+44",  label: "+44 (Velká Británie)" },
  { code: "+48",  label: "+48 (Polsko)" },
];

// ---------------------------------------------------------
// Formát telefonu                                           
// ---------------------------------------------------------
export function formatPhone(cc, digits) {
  const c = digits.replace(/\D/g, "");
  switch (cc) {
    case "+420":
    case "+421":
    case "+48":
      return c.replace(/(\d{3})(\d{3})(\d{0,3})/, (_, a, b, d) => [a, b, d].filter(Boolean).join(" "));
    case "+44":
      return c.replace(/(\d{5})(\d{0,5})/, (_, a, b) => [a, b].filter(Boolean).join(" "));
    case "+47":
      return c.replace(/(\d{3})(\d{2})(\d{0,3})/, (_, a, b, d) => [a, b, d].filter(Boolean).join(" "));
    default:
      return c.replace(/(\d{3})(\d{3})(\d{0,3})/, (_, a, b, d) => [a, b, d].filter(Boolean).join(" "));
  }
}

// ---------------------------------------------------------
// Komponenta OnlineForm                                     
// ---------------------------------------------------------
export default function OnlineForm() {
  const now   = new Date();
  const today = now.toISOString().split("T")[0];
  const time  = now.toTimeString().slice(0, 5);

  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    address: "",
    email: "",
    countryCode: COUNTRY_CODES[0].code,
    phone: "",
    message: "",
    date: today,
    time,
    photos: [],
    damage: "",
    age: "",
  });

  // ---------------- Handlery ----------------
  const onChange = (e) => setData({ ...data, [e.target.name]: e.target.value });
  const onCountry = (e) => setData({ ...data, countryCode: e.target.value, phone: formatPhone(e.target.value, data.phone) });
  const onPhone   = (e) => setData({ ...data, phone: formatPhone(data.countryCode, e.target.value) });
  const onPhotos  = (e) => setData({ ...data, photos: e.target.files });

  // ---------------- PDF helper -------------
  const buildPdfBlob = () => {
    const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    doc.setFontSize(14);
    doc.text("Reklamační dotazník", 40, 40);

    const fullPhone = `${data.countryCode} ${data.phone}`.trim();
    const lines = [
      `Jméno: ${data.firstName} ${data.lastName}`,
      `Adresa: ${data.address}`,
      `E‑mail: ${data.email}`,
      `Telefon: ${fullPhone}`,
      `Poškození: ${data.damage}`,
      `Stáří (měsíce): ${data.age}`,
      `Datum vyplnění: ${data.date}`,
      `Čas vyplnění: ${data.time}`,
      "Popis závady:",
      data.message,
    ];
    let y = 70;
    lines.forEach((l) => {
      const split = doc.splitTextToSize(l, 500);
      doc.text(split, 40, y);
      y += split.length * 18 + 6;
    });

    return doc.output("blob");
  };

  const blobToDataURL = (blob) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onloadend = () => res(r.result);
    r.onerror  = rej;
    r.readAsDataURL(blob);
  });

  // ---------------- SUBMIT ------------------
  const onSubmit = async (e) => {
    e.preventDefault();

    // PDF jako příloha
    const pdfBlob = buildPdfBlob();
    const base64  = await blobToDataURL(pdfBlob);

    const attachments = [{ name: `reklamace_${Date.now()}.pdf`, data: base64 }];
    const templateParams = { to_email: "ondrej.steinhauser@gmail.com" };

    const missing = [EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY].some((k) => ["SERVICE_ID","TEMPLATE_ID","PUBLIC_KEY"].includes(k));
    if (missing) {
      alert("E‑mail se neodeslal – chybí konfigurace EmailJS.");
      console.warn("EmailJS absent. PDF blob:", pdfBlob);
      return;
    }

    emailjs
      .send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, {
        publicKey: EMAILJS_PUBLIC_KEY,
        attachments,
      })
      .then(() => alert("Děkujeme! Formulář & PDF byly odeslány."))
      .catch((err) => {
        console.error(err);
        alert("Chyba při odesílání: " + err.text);
      });
  };

  // --------------- JSX ----------------------
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">Reklamační dotazník</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Jméno a příjmení */}
            <div>
              <Label htmlFor="firstName">Jméno</Label>
              <Input id="firstName" name="firstName" required value={data.firstName} onChange={onChange} />
            </div>
            <div>
              <Label htmlFor="lastName">Příjmení</Label>
              <Input id="lastName" name="lastName" required value={data.lastName} onChange={onChange} />
            </div>
            {/* Adresa */}
            <div>
              <Label htmlFor="address">Adresa</Label>
              <Input id="address" name="address" required value={data.address} onChange={onChange} />
            </div>
            {/* E‑mail */}
            <div>
              <Label htmlFor="email">E‑mail</Label>
              <Input id="email" type="email" name="email" required value={data.email} onChange={onChange} />
            </div>
            {/* Telefon */}
            <div>
              <Label>Tel. číslo</Label>
              <div className="flex gap-2 items-center">
                <select name="countryCode" value={data.countryCode} onChange={onCountry} className="border border-gray-300 rounded-md p-2 bg-white max-w-[9rem]">
                  {COUNTRY_CODES.map(({ code, label }) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
                <Input id="phone" name="phone" type="tel" pattern="[0-9 ]{5,20}" placeholder="123 456 789" className="flex-1" value={data.phone} onChange={onPhone} />
              </div>
            </div>
            {/* Popis závady */}
            <div>
              <Label htmlFor="message">Popis závady</Label>
              <Textarea id="message" name="message" rows={4} required value={data.message} onChange={onChange} />
            </div>
            {/* Fotografie */}
            <div>
              <Label htmlFor="photos">Fotografie (můžete vybrat více)</Label>
              <Input id="photos" name="photos" type="file" accept="image/*" multiple onChange={onPhotos} />
            </div>
            {/* Poškození */}
            <div>
              <Label htmlFor="damage">Poškození</Label>
              <select id="damage" name="damage" required value={data.damage} onChange={onChange} className="w-full border border-gray-300 rounded-md p-2">
                <option value="">-- Vyberte --</option>
                <option value="ano">Ano</option>
                <option value="ne">Ne</option>
              </select>
            </div>
            {/* Stáří */}
            <div>
              <Label htmlFor="age">Stáří (v měsících)</Label>
              <Input id="age" name="age" type="number" min="0" required value={data.age} onChange={onChange} />
            </div>
            {/* Datum & čas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Datum vyplnění</Label>
                <Input id="date" name="date" type="date" readOnly value={data.date} className="cursor-not-allowed bg-gray-100" />
              </div>
              <div>
                <Label htmlFor="time">Čas vyplnění</Label>
                <Input id="time" name="time" type="time" readOnly value={data.time} className="cursor-not-allowed bg-gray-100" />
              </div>
            </div>
            {/* Akce */}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => jsPDF_supported() && buildPdfBlob() && jsPDF_supported() && window.open(URL.createObjectURL(buildPdfBlob()))}>Uložit jako PDF</Button>
              <Button type="submit" className="flex-1">Odeslat e‑mailem</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper: detect jsPDF loaded (for onClick guard)
function jsPDF_supported() {
  if (!jsPDF) { alert("jsPDF nenalezen"); return false; }
  return true;
}
