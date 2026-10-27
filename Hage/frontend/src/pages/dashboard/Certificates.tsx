import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Upload, Award, Sparkles, Eye, Trash2, FileText } from "lucide-react";
import { useTradeStore } from "../../store/useTradeStore";
import { triggerReadOnlyAlert } from "../../store/subscriptionRules";
import { format } from "date-fns";

interface StoredCert {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  uploadedAt: string;
}

const STORAGE_KEY = "hage_uploaded_certificates";

function loadCerts(): StoredCert[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCerts(certs: StoredCert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(certs));
}

export default function Certificates() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedCerts, setUploadedCerts] = useState<StoredCert[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { campaigns, setCertificateModalCampaign } = useTradeStore();

  useEffect(() => {
    setUploadedCerts(loadCerts());
  }, []);

  const passedCampaigns = campaigns.filter(c => c.status === "Passed");

  const handleUploadClick = () => {
    if (triggerReadOnlyAlert('upload a certificate or document')) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (triggerReadOnlyAlert('upload a certificate or document')) return;
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);

    const files = Array.from(e.target.files);

    const newCerts: StoredCert[] = await Promise.all(
      files.map(file => {
        return new Promise<StoredCert>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              id: `cert_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              name: file.name,
              type: file.type,
              dataUrl: reader.result as string,
              uploadedAt: new Date().toISOString(),
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    const updated = [...loadCerts(), ...newCerts];
    saveCerts(updated);
    setUploadedCerts(updated);
    setIsUploading(false);
    e.target.value = "";
  };

  const handleDelete = (id: string) => {
    if (triggerReadOnlyAlert('delete a certificate')) return;
    const updated = loadCerts().filter(c => c.id !== id);
    saveCerts(updated);
    setUploadedCerts(updated);
  };

  return (
    <div className="max-w-[1680px] mx-auto w-full pb-16 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-[#111722]/80 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-[#1E293B] shadow-xs">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Award className="w-7 h-7 text-[#C9A227]" />
              Official Certificates &amp; Accreditations
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1">
              Official HAGE challenge pass certificates and external prop firm payout verification documents.
            </p>
          </div>
          <div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} multiple />
            <Button onClick={handleUploadClick} className="flex items-center gap-2" disabled={isUploading}>
              <Upload className="w-4 h-4" />
              <span>{isUploading ? "Uploading..." : "Upload Prop Firm Document"}</span>
            </Button>
          </div>
        </div>

        {/* Official HAGE Certificates */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C9A227]" />
              <span>Earned Evaluation Pass Certificates</span>
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60">
              {passedCampaigns.length} {passedCampaigns.length === 1 ? "Passed Challenge" : "Passed Challenges"}
            </span>
          </div>

          {passedCampaigns.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white/70 dark:bg-[#111722]/80 border border-gray-200/80 dark:border-[#1E293B]">
              <Award className="w-10 h-10 text-[#C9A227] mx-auto mb-2 opacity-50" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">No evaluation certificates issued yet</h4>
              <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                Reach your Profit Target on an active Phase 1 or Phase 2 challenge account to automatically receive your official HAGE Certificate of Achievement.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {passedCampaigns.map(c => (
                <Card key={c.id} className="border-2 border-[#C9A227]/40 bg-gradient-to-br from-[#0B0E14] via-[#111827] to-[#0d131f] text-white shadow-md hover:shadow-xl transition-all duration-200">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9A227] to-[#8C6D14] flex items-center justify-center shadow-xs">
                          <Sparkles className="w-4 h-4 text-black" />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#C9A227] block">HAGE ACCREDITATION</span>
                          <span className="text-xs font-bold text-white">Certificate of Achievement</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">PASSED</span>
                        {(c.nextPhaseConnected || campaigns.some(other => other.parentCampaignId === c.id)) && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">CONNECTED</span>
                        )}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-white/[0.04] border border-[#C9A227]/25 space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-slate-400">Account:</span><span className="font-bold text-white">{c.name}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Prop Firm:</span><span className="font-semibold text-slate-200">{c.broker}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Account Capital:</span><span className="font-black text-emerald-400">${c.accountSize.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Profit Target Hit:</span><span className="font-black text-emerald-400">+{c.profitTargetPercent || 8}%</span></div>
                      <div className="flex justify-between pt-1 border-t border-slate-700/60">
                        <span className="text-slate-400">Date Passed:</span>
                        <span className="font-bold text-slate-200">{c.passedDate ? format(new Date(c.passedDate), "MMM d, yyyy") : "Completed"}</span>
                      </div>
                    </div>
                    <button onClick={() => setCertificateModalCampaign(c)} className="w-full py-2 px-3 bg-gradient-to-r from-[#C9A227] to-[#A07C16] hover:from-[#dcb538] hover:to-[#b08b1a] text-black font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
                      <Eye className="w-3.5 h-3.5 text-black" />
                      <span>View &amp; Save Certificate</span>
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Uploaded External Certificates */}
        <div className="space-y-3 pt-4 border-t border-gray-200/80 dark:border-[#1E293B]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-500" />
              <span>Uploaded External Prop Firm Certificates</span>
            </h2>
            {uploadedCerts.length > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60">
                {uploadedCerts.length} {uploadedCerts.length === 1 ? "Document" : "Documents"} saved
              </span>
            )}
          </div>

          {uploadedCerts.length === 0 ? (
            <Card className="min-h-[200px] flex items-center justify-center bg-gray-50/60 dark:bg-[#111722]/50 border-dashed border-2 border-gray-200 dark:border-slate-800 rounded-2xl">
              <div className="text-center p-6">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Upload External Certificates</h4>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 mb-3">
                  Upload prop firm payout certificates or broker confirmation letters to store with your records.
                </p>
                <Button variant="outline" size="sm" onClick={handleUploadClick}>Browse Files</Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {uploadedCerts.map((cert) => (
                <Card key={cert.id} className="p-4 flex flex-col items-center justify-center min-h-[220px] shadow-xs hover:shadow-md transition-shadow group relative">
                  <button
                    onClick={() => handleDelete(cert.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 cursor-pointer z-10"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-full flex-1 bg-indigo-50/50 dark:bg-[#182030] rounded-xl mb-3 flex items-center justify-center overflow-hidden max-h-[160px]">
                    {cert.type.startsWith("image/") ? (
                      <img src={cert.dataUrl} alt={cert.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-indigo-400 flex flex-col items-center p-4 text-center gap-2">
                        <FileText className="w-10 h-10" />
                        <span className="font-bold text-sm uppercase">{cert.name.split(".").pop()}</span>
                      </div>
                    )}
                  </div>

                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white truncate w-full text-center" title={cert.name}>{cert.name}</h4>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">{format(new Date(cert.uploadedAt), "MMM d, yyyy")}</p>

                  <a href={cert.dataUrl} download={cert.name} className="mt-2.5 w-full py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 text-[11px] font-bold text-center transition-all border border-blue-500/20 cursor-pointer">
                    Download
                  </a>
                </Card>
              ))}

              <button
                onClick={handleUploadClick}
                disabled={isUploading}
                className="min-h-[220px] rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-500 hover:border-blue-500/40 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all cursor-pointer"
              >
                <Upload className="w-6 h-6" />
                <span className="text-xs font-semibold">Add More</span>
              </button>
            </div>
          )}
        </div>

      </motion.div>
    </div>
  );
}
