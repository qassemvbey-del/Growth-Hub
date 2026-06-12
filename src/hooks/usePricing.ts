import { useState } from 'react'
import { useToast } from '@/components/ui/Toast'

export function usePricing() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const { showToast } = useToast()

  const handleCheckout = async (tierId: string) => {
    setLoadingTier(tierId)
    try {
      const response = await fetch('/api/payments/paymob', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId: tierId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Payment gateway error')
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('Invalid checkout response from gateway')
      }
    } catch (err: any) {
      console.error('Checkout initialization failed:', err)
      showToast(err.message || 'Payment initiation failed. Please try again.', 'warning')
    } finally {
      setLoadingTier(null)
    }
  }

  return {
    loadingTier,
    handleCheckout,
  }
}
