import type { LocalizedText } from '@sezi/shared';
import { Eye } from 'lucide-react';
import { useId, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { ALT_MAX, localized, mediaUrl, needsAlt, tr, type MediaRow } from '@/lib/data';

/**
 * Fotoğraf başına görme engelli kullanıcı için kısa tarif (media.alt_text, TR zorunlu + EN).
 * Uygulama bu metni kapak fotoğrafında ve fotoğraf görüntüleyicide ekran okuyucuya okutur.
 */
export function PhotoAltEditor({
  row,
  workName,
  busy,
  onSave,
}: {
  row: MediaRow;
  workName: string;
  busy: boolean;
  onSave: (alt: LocalizedText) => Promise<void>;
}) {
  const id = useId();
  const missing = needsAlt(row, workName);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState({ tr: '', en: '' });
  const [error, setError] = useState<string | null>(null);

  const start = (next: boolean) => {
    if (next) {
      // Yer tutucu (eser adı) alana taşınmaz: yönetici sıfırdan tarif yazar.
      setText(missing ? { tr: '', en: '' } : { tr: tr(row.alt_text), en: row.alt_text.en ?? '' });
      setError(null);
    }
    setOpen(next);
  };

  const submit = async () => {
    const value = localized(text);
    if (!value) return setError('Türkçe tarif zorunlu.');
    if (value.tr.length > ALT_MAX || (value.en?.length ?? 0) > ALT_MAX) return setError(`Tarif en çok ${ALT_MAX} karakter olabilir.`);
    try {
      await onSave(value);
      setOpen(false);
    } catch {
      // Hata bildirimi kaydetme mutasyonunda; pencere açık kalır, yazılan tarif kaybolmaz.
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {missing ? (
        <Badge variant="warning" className="w-fit">Görsel tarifi yok</Badge>
      ) : (
        <p className="line-clamp-3 text-xs text-muted-foreground" title={tr(row.alt_text)}>
          <span className="font-medium text-foreground">Tarif: </span>
          {tr(row.alt_text)}
        </p>
      )}
      <Dialog open={open} onOpenChange={start}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="xs" className="w-fit">
            <Eye data-icon="inline-start" />
            {missing ? 'Tarif yaz' : 'Tarifi düzenle'}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Görsel tarifi</DialogTitle>
            <DialogDescription>
              Görmeyen kullanıcıya ekran okuyucu bu metni okur. Fotoğrafta ne göründüğünü bir iki cümleyle anlatın: açı, öne çıkan
              öğeler, ışık, insanlar. Eserin adını ya da tarihçesini tekrarlamayın; yalnız fotoğrafta görüleni yazın.
            </DialogDescription>
          </DialogHeader>
          <img
            src={mediaUrl(row.thumb_path ?? row.storage_path)}
            alt=""
            className="max-h-56 w-full rounded-lg bg-muted object-contain"
          />
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}>
            <FieldGroup>
              {(['tr', 'en'] as const).map((lang) => (
                <Field key={lang} data-invalid={lang === 'tr' && !!error}>
                  <FieldLabel htmlFor={`${id}-${lang}`}>{lang === 'tr' ? 'Tarif (TR) *' : 'Tarif (EN, isteğe bağlı)'}</FieldLabel>
                  <Textarea
                    id={`${id}-${lang}`}
                    value={text[lang]}
                    maxLength={ALT_MAX}
                    rows={3}
                    required={lang === 'tr'}
                    aria-invalid={lang === 'tr' && !!error}
                    aria-describedby={lang === 'tr' && error ? `${id}-tr-help ${id}-error` : `${id}-${lang}-help`}
                    placeholder={lang === 'tr' ? 'Ör. Taş kemerli giriş kapısı önden; kapının iki yanında kumaş tezgâhları ve kalabalık.' : ''}
                    onChange={(e) => setText({ ...text, [lang]: e.target.value })}
                  />
                  <FieldDescription id={`${id}-${lang}-help`} className="num">
                    {text[lang].trim().length} / {ALT_MAX}
                  </FieldDescription>
                </Field>
              ))}
              {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
            </FieldGroup>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" className="min-h-12" onClick={() => setOpen(false)}>
                Vazgeç
              </Button>
              <Button type="submit" className="min-h-12" disabled={busy}>
                Kaydet
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
