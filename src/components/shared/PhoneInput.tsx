import * as React from "react"
import { Input } from "@/components/ui/input"
import { formatPhone } from "@/lib/utils"

interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value: string
  onChange: (value: string) => void
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  function PhoneInput({ value, onChange, ...props }, ref) {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10)
      onChange(cleaned)
    }

    return (
      <Input
        {...props}
        ref={ref}
        value={formatPhone(value)}
        onChange={handleChange}
        placeholder="06 XX XX XX XX"
        maxLength={14}
      />
    )
  }
)
