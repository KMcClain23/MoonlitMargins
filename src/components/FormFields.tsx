export type FormField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox-group" | "birthday";
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function TextField({
  name,
  label,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-muted">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-parchment placeholder:text-muted/60 focus:border-lilac"
      />
    </label>
  );
}

export function Field({ field }: { field: FormField }) {
  if (field.type === "textarea") {
    return (
      <label className="block">
        <span className="mb-2 block text-sm text-muted">{field.label}</span>
        <textarea
          name={field.name}
          required={field.required}
          placeholder={field.placeholder}
          rows={4}
          className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-parchment placeholder:text-muted/60 focus:border-lilac"
        />
      </label>
    );
  }

  if (field.type === "checkbox-group") {
    return (
      <fieldset>
        <legend className="mb-2 block text-sm text-muted">
          {field.label}
          {field.required ? <span className="text-candle"> *</span> : null}
        </legend>
        <div className="space-y-2">
          {field.options?.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-parchment">
              <input type="checkbox" name={field.name} value={option} className="h-4 w-4 rounded border-hairline" />
              {option}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === "select") {
    return (
      <label className="block">
        <span className="mb-2 block text-sm text-muted">{field.label}</span>
        <select
          name={field.name}
          required={field.required}
          defaultValue=""
          className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-parchment focus:border-lilac"
        >
          <option value="" disabled>
            Choose one
          </option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "birthday") {
    // Rendered as three separate inputs (month/day/year), but collected
    // back into one formatted answer string -- see collectBirthdayAnswer.
    return (
      <fieldset>
        <legend className="mb-2 block text-sm text-muted">
          {field.label}
          {field.required ? <span className="text-candle"> *</span> : null}
        </legend>
        <div className="grid grid-cols-3 gap-3">
          <select
            name={`${field.name}__month`}
            required={field.required}
            defaultValue=""
            className="rounded-lg border border-hairline bg-surface px-3 py-3 text-sm text-parchment focus:border-lilac"
          >
            <option value="" disabled>
              Month
            </option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            name={`${field.name}__day`}
            type="number"
            min={1}
            max={31}
            placeholder="Day"
            required={field.required}
            className="rounded-lg border border-hairline bg-surface px-3 py-3 text-sm text-parchment placeholder:text-muted/60 focus:border-lilac"
          />
          <input
            name={`${field.name}__year`}
            type="number"
            placeholder="Year (optional)"
            className="rounded-lg border border-hairline bg-surface px-3 py-3 text-sm text-parchment placeholder:text-muted/60 focus:border-lilac"
          />
        </div>
      </fieldset>
    );
  }

  return <TextField name={field.name} label={field.label} required={field.required} />;
}

/** Combines a birthday field's three separate inputs into one stored string. */
export function collectBirthdayAnswer(formData: FormData, fieldName: string): string {
  const month = String(formData.get(`${fieldName}__month`) ?? "");
  const day = String(formData.get(`${fieldName}__day`) ?? "");
  const year = String(formData.get(`${fieldName}__year`) ?? "");
  if (!month && !day) return "";
  return year ? `${month} ${day}, ${year}` : `${month} ${day}`;
}

/** Builds the `answers` record for a set of fields from a submitted FormData. */
export function collectAnswers(formData: FormData, fields: FormField[]): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const field of fields) {
    if (field.type === "checkbox-group") {
      answers[field.name] = formData.getAll(field.name).join(", ");
    } else if (field.type === "birthday") {
      answers[field.name] = collectBirthdayAnswer(formData, field.name);
    } else {
      answers[field.name] = String(formData.get(field.name) ?? "");
    }
  }
  return answers;
}
