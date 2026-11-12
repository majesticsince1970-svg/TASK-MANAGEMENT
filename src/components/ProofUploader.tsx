import { useState, useRef } from 'react';
import { Camera, Upload, Hash, Link2, FileText, CheckSquare, Pen, Video, CreditCard, AlignLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubmitProof } from '@/features/tasks/hooks';
import type { ProofType } from '@/types/database';

interface ProofUploaderProps {
  taskId: string;
  proofType: ProofType;
  proofRule?: Record<string, unknown> | null;
}

export function ProofUploader({ taskId, proofType, proofRule }: ProofUploaderProps) {
  const submitProof = useSubmitProof();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [numberValue, setNumberValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [linkValue, setLinkValue] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = () => {
    submitProof.mutate({
      taskId,
      kind: proofType,
      files: files.length > 0 ? files : undefined,
      value_numeric: numberValue ? Number(numberValue) : undefined,
      value_text: textValue || linkValue || undefined,
    });
  };

  const proofIcons: Record<string, React.ElementType> = {
    photo: Camera, file: FileText, video: Video, number: Hash,
    checklist: CheckSquare, signature: Pen, link: Link2,
    payment_list: CreditCard, text_note: AlignLeft,
  };
  const Icon = proofIcons[proofType] || Upload;

  if (proofType === 'none') return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-[var(--color-ink)]/60">
        <Icon className="w-4 h-4" />
        <span className="capitalize">{proofType.replace(/_/g, ' ')} required</span>
      </div>

      {/* File-based proofs */}
      {['photo', 'file', 'video', 'signature'].includes(proofType) && (
        <div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept={proofType === 'photo' ? 'image/*' : proofType === 'video' ? 'video/*' : '*'}
            capture={proofType === 'photo' ? 'environment' : undefined}
            onChange={handleFileSelect}
            multiple
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex flex-col items-center gap-2 py-6 border-2 border-dashed border-[#E5DDD3] rounded-xl hover:border-[var(--color-maroon)]/30 hover:bg-[var(--color-ivory)] transition-colors"
          >
            <Icon className="w-8 h-8 text-[var(--color-ink)]/30" />
            <span className="text-sm text-[var(--color-ink)]/50">
              {proofType === 'photo' ? 'Take photo or upload' : `Upload ${proofType}`}
            </span>
          </button>
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[var(--color-ink)]/60 bg-[var(--color-ivory)] px-3 py-1.5 rounded-lg">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="truncate">{f.name}</span>
                  <span className="text-[10px] ml-auto">{(f.size / 1024).toFixed(0)} KB</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Number proof */}
      {proofType === 'number' && (
        <div>
          <input
            type="number"
            value={numberValue}
            onChange={(e) => setNumberValue(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-lg font-mono"
            placeholder={proofRule?.unit ? `Enter ${proofRule.unit}...` : 'Enter value...'}
          />
          {proofRule?.min != null && proofRule?.max != null && (
            <p className="text-xs text-[var(--color-ink)]/40 mt-1">
              Expected range: {String(proofRule.min)} – {String(proofRule.max)} {proofRule?.unit ? String(proofRule.unit) : ''}
            </p>
          )}
        </div>
      )}

      {/* Link proof */}
      {proofType === 'link' && (
        <input
          type="url"
          value={linkValue}
          onChange={(e) => setLinkValue(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm"
          placeholder="https://..."
        />
      )}

      {/* Text note proof */}
      {proofType === 'text_note' && (
        <textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm resize-none"
          rows={4}
          placeholder="Write your note..."
        />
      )}

      {/* Payment list proof */}
      {proofType === 'payment_list' && (
        <div className="space-y-2">
          <textarea
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[#E5DDD3] bg-[var(--color-ivory)] text-sm font-mono resize-none"
            rows={6}
            placeholder={"Name, Amount\nJohn, 5000\nMary, 12000"}
          />
          <p className="text-xs text-[var(--color-ink)]/40">Enter one item per line: Name, Amount</p>
        </div>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={submitProof.isPending || (
          ['photo', 'file', 'video', 'signature'].includes(proofType) ? files.length === 0 :
          proofType === 'number' ? !numberValue :
          proofType === 'link' ? !linkValue :
          proofType === 'text_note' || proofType === 'payment_list' ? !textValue : false
        )}
        className="w-full"
      >
        {submitProof.isPending ? 'Submitting...' : 'Submit Proof & Complete'}
      </Button>
    </div>
  );
}

