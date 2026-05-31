const email = "sales@globalplcparts.com";
const whatsappNumber = "13774696836";

export const metadata = {
  title: "Request Quote for Industrial Automation Parts | GlobalPLCParts",
  description:
    "Request a quote for PLC, DCS, HMI, drives and industrial automation spare parts. Send part number, quantity, company details and delivery requirements.",
};

export default function RequestQuotePage() {
  const whatsappText = encodeURIComponent(
    "Hello GlobalPLCParts, I want to request a quote for industrial automation parts."
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <p className="text-green-400 font-black mb-4">
              Industrial RFQ Center
            </p>

            <h1 className="text-5xl lg:text-6xl font-black leading-tight mb-6">
              Request Quote for PLC, DCS & Industrial Automation Parts
            </h1>

            <p className="text-slate-300 text-xl leading-8">
              Send your part number, quantity and delivery requirements. Our
              team will check availability, price and lead time for industrial
              automation spare parts.
            </p>
          </div>

          <div className="bg-white text-slate-900 rounded-3xl p-8 shadow-xl">
            <h2 className="text-3xl font-black mb-4">
              Fast RFQ Response
            </h2>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <Info title="Response Time" value="Within 24 Hours" />
              <Info title="Shipping" value="Worldwide" />
              <Info title="Products" value="PLC / DCS / HMI" />
              <Info title="Support" value="Obsolete Parts" />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border rounded-3xl p-8">
          <h2 className="text-4xl font-black mb-8">
            Submit Your RFQ Details
          </h2>

          <form
            action={`mailto:${email}`}
            method="post"
            encType="text/plain"
            className="space-y-6"
          >
            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Company Name" name="Company Name" required />
              <Field label="Contact Name" name="Contact Name" required />
              <Field label="Email Address" name="Email" type="email" required />
              <Field label="WhatsApp / Phone" name="Phone" />
              <Field label="Country / Region" name="Country" required />
              <Field label="Target Delivery Date" name="Target Delivery Date" />
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Part Number / Model" name="Part Number" required />
              <Field label="Brand" name="Brand" />
              <Field label="Quantity" name="Quantity" required />
              <Field label="Condition Required" name="Condition Required" />
            </div>

            <div>
              <label className="block font-black mb-2">
                RFQ Details / BOM List
              </label>
              <textarea
                name="RFQ Details"
                rows={8}
                placeholder="Example: Allen Bradley 1756-EN2T, quantity 2 pcs, destination United States. Please quote price and lead time."
                className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="bg-slate-50 border rounded-2xl p-5">
              <h3 className="font-black mb-2">
                Need to send a BOM file?
              </h3>
              <p className="text-slate-600 leading-7">
                You can email your Excel, PDF or part list directly to{" "}
                <a href={`mailto:${email}`} className="text-blue-600 font-black">
                  {email}
                </a>
                . Please include part numbers, quantity and delivery country.
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700"
            >
              Submit RFQ by Email
            </button>
          </form>
        </div>

        <aside className="space-y-6">
          <div className="bg-slate-900 text-white rounded-3xl p-8">
            <h2 className="text-3xl font-black mb-4">
              Contact Sales Directly
            </h2>

            <p className="text-slate-300 leading-7 mb-6">
              For urgent industrial spare parts, contact our sales team by
              email or WhatsApp.
            </p>

            <div className="space-y-4">
              <a
                href={`mailto:${email}`}
                className="block bg-blue-600 text-white text-center py-4 rounded-xl font-black"
              >
                Email Sales
              </a>

              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
                target="_blank"
                className="block bg-green-500 text-white text-center py-4 rounded-xl font-black"
              >
                WhatsApp RFQ
              </a>
            </div>
          </div>

          <div className="bg-white border rounded-3xl p-8">
            <h2 className="text-3xl font-black mb-5">
              What to Include
            </h2>

            <div className="space-y-3">
              <Point text="Part number or model" />
              <Point text="Brand name" />
              <Point text="Required quantity" />
              <Point text="Destination country" />
              <Point text="Preferred condition" />
              <Point text="Target delivery time" />
            </div>
          </div>

          <div className="bg-white border rounded-3xl p-8">
            <h2 className="text-3xl font-black mb-5">
              We Supply
            </h2>

            <div className="space-y-3">
              <Point text="PLC Modules" />
              <Point text="DCS Modules" />
              <Point text="HMI Panels" />
              <Point text="Power Supplies" />
              <Point text="I/O Modules" />
              <Point text="Obsolete Parts" />
            </div>
          </div>
        </aside>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="bg-white border rounded-3xl p-8">
          <h2 className="text-4xl font-black mb-8">
            RFQ Process
          </h2>

          <div className="grid md:grid-cols-4 gap-5">
            <Step number="1" title="Send Part Number" />
            <Step number="2" title="Check Stock & Price" />
            <Step number="3" title="Confirm Lead Time" />
            <Step number="4" title="Arrange Shipping" />
          </div>
        </div>
      </section>

      <a
        href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
        target="_blank"
        className="fixed right-6 bottom-6 z-50 bg-green-500 text-white px-6 py-4 rounded-full shadow-lg font-black"
      >
        WhatsApp
      </a>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block font-black mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full border rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="border rounded-2xl p-4">
      <p className="text-slate-500 text-sm mb-1">{title}</p>
      <p className="font-black">{value}</p>
    </div>
  );
}

function Point({ text }: { text: string }) {
  return (
    <div className="border rounded-xl p-3 font-bold">
      ✓ {text}
    </div>
  );
}

function Step({ number, title }: { number: string; title: string }) {
  return (
    <div className="bg-slate-50 border rounded-2xl p-6 text-center">
      <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-black">
        {number}
      </div>
      <h3 className="font-black">{title}</h3>
    </div>
  );
}