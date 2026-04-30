import * as React from "react"
import { Input } from "@/components/ui/input"
import { formatPhone } from "@/lib/utils"

interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: string
  onChange: (value: string) => void
}

export function PhoneInput({ value, onChange, ...props }: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    // On nettoie pour ne garder que les chiffres (max 10)
    const cleaned = rawValue.replace(/\D/g, '').slice(0, 10)
    // On notifie le parent avec la valeur brute (chiffres uniquement)
    onChange(cleaned)
  }

  return (
    <Input
      {...props}
      value={formatPhone(value)}
      onChange={handleChange}
      placeholder="06 XX XX XX XX"
      maxLength={14} // 10 chiffres + 4 espaces
    />
  )
}
