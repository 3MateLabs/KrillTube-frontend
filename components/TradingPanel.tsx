'use client'

import { useState } from 'react'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { Loader2, AlertCircle, Wallet, TrendingUp, TrendingDown } from 'lucide-react'
import { ConnectWallet } from './ConnectWallet'

interface TradingPanelProps {
  video: {
    id: string
    title?: string
  }
  refCode: string | null
}

export function TradingPanel({ video, refCode }: TradingPanelProps) {
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [slippage, setSlippage] = useState('15')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const currentAccount = useCurrentAccount()
  const isConnected = !!currentAccount
  
  const quickBuyAmounts = [0.1, 0.5, 1, 5]
  const quickSellPercentages = [25, 50, 75, 100]
  
  const handleQuickAction = (value: number) => {
    if (tradeType === 'buy') {
      setAmount(value.toString())
    } else {
      setAmount(`${value}%`)
    }
  }
  
  const handleTrade = async () => {
    if (!amount || isProcessing) return
    
    setIsProcessing(true)
    setError(null)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      console.log('Trade executed:', {
        type: tradeType,
        amount,
        slippage,
        video: video.id,
        refCode
      })
      
      setAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trade failed')
    } finally {
      setIsProcessing(false)
    }
  }
  
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6">
        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <Wallet className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-sm text-gray-400 text-center mb-6">
          Connect your wallet to start trading video tokens directly on X
        </p>
        <ConnectWallet />
      </div>
    )
  }
  
  return (
    <div className="p-4 space-y-4">
      {/* Trade Type Selector */}
      <div className="flex gap-2 p-1 bg-gray-900 rounded-lg">
        <button
          onClick={() => setTradeType('buy')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium text-sm transition-all ${
            tradeType === 'buy'
              ? 'bg-emerald-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Buy
        </button>
        <button
          onClick={() => setTradeType('sell')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md font-medium text-sm transition-all ${
            tradeType === 'sell'
              ? 'bg-red-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          Sell
        </button>
      </div>
      
      {/* Amount Input */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400">Amount</label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={tradeType === 'buy' ? 'Enter SUI amount' : 'Enter token amount'}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          disabled={isProcessing}
        />
        
        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          {tradeType === 'buy' 
            ? quickBuyAmounts.map(amt => (
                <button
                  key={amt}
                  onClick={() => handleQuickAction(amt)}
                  className="py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
                >
                  {amt} SUI
                </button>
              ))
            : quickSellPercentages.map(pct => (
                <button
                  key={pct}
                  onClick={() => handleQuickAction(pct)}
                  className="py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-md transition-colors"
                >
                  {pct}%
                </button>
              ))
          }
        </div>
      </div>
      
      {/* Slippage Settings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-400">Slippage Tolerance</label>
          <span className="text-xs text-blue-400">{slippage}%</span>
        </div>
        <div className="flex gap-2">
          {['1', '5', '10', '15'].map(val => (
            <button
              key={val}
              onClick={() => setSlippage(val)}
              className={`flex-1 py-1 text-xs rounded-md transition-colors ${
                slippage === val
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {val}%
            </button>
          ))}
        </div>
      </div>
      
      {/* Trade Info */}
      <div className="p-3 bg-gray-900/50 rounded-lg space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Estimated Gas</span>
          <span className="text-white">~0.001 SUI</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Price Impact</span>
          <span className="text-yellow-400">&lt;0.01%</span>
        </div>
        {refCode && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Referral Bonus</span>
            <span className="text-purple-400">1%</span>
          </div>
        )}
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
      
      {/* Execute Trade Button */}
      <button
        onClick={handleTrade}
        disabled={!amount || isProcessing}
        className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
          tradeType === 'buy'
            ? 'bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50'
            : 'bg-red-500 hover:bg-red-600 disabled:bg-red-500/50'
        } text-white disabled:cursor-not-allowed`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            {tradeType === 'buy' ? 'Buy Tokens' : 'Sell Tokens'}
          </>
        )}
      </button>
      
      {/* Wallet Info */}
      <div className="text-center text-xs text-gray-500">
        Connected: {currentAccount?.address.slice(0, 6)}...{currentAccount?.address.slice(-4)}
      </div>
    </div>
  )
}