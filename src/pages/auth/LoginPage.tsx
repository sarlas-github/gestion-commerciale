import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { APP_NAME } from '@/lib/constants'

export const LoginPage = () => {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError('Email ou mot de passe incorrect.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel - Brand side */}
      <div className="hidden lg:flex flex-col w-1/3 bg-primary text-primary-foreground p-12">
        <div className="flex items-center gap-2 font-bold text-xl mb-auto">
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-full w-full">
              <path d="M75 35 A25 25 0 1 0 75 65" fill="none" stroke="white" strokeWidth="10" strokeLinecap="round"/>
              <path d="M50 25 L60 50 L50 75 L40 50 Z" fill="white" transform="rotate(45 50 50)"/>
              <circle cx="50" cy="50" r="4" fill="currentColor" />
            </svg>
          </div>
          {APP_NAME}
        </div>

        <div className="space-y-4 max-w-sm">
          <h1 className="text-4xl font-bold leading-tight">
            Pilotez votre activité commerciale avec précision.
          </h1>
          <p className="text-primary-foreground/80 leading-relaxed text-sm">
            De l’achat à la vente  —<br /> suivez vos flux en temps réel.
          </p>
        </div>

        <div className="mt-auto text-xs text-primary-foreground/50">
          {APP_NAME} © {new Date().getFullYear()}
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Connexion</h2>
            <p className="text-sm text-muted-foreground">
              Connectez-vous à votre espace {APP_NAME}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive font-medium">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="client@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mot de passe</Label>
                <a href="#" className="text-xs text-primary hover:underline font-medium">Mot de passe oublié ?</a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 text-base font-medium bg-primary hover:bg-primary/90" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}





