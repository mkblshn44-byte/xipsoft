'use client'

import React from 'react'

export interface RankglowAvatarProps {
  avatar: string | null
  username: string
  rankColor?: string
  isNeon?: boolean
  className?: string
  size?: number
}

/**
 * Rank glow Avatar - CSS Variables kullanarak dinamik glow efekti
 * @param avatar - Avatar URL
 * @param username - Kullan�-c�- ad�-
 * @param rankColor - R+-tbe rengi (--rank-color CSS variable'�- olarak kullan�-lacak)
 * @param isNeon - Neon parlama efekti aktif mi?
 */
export const RankglowAvatar: React.FC<RankglowAvatarProps> = ({
  avatar,
  username,
  rankColor = '#a78bfa',
  isNeon = false,
  className = '',
  size,
}) => {
  return (
    <div
      style={
        {
          '--rank-color': rankColor,
          ...(size ? { width: size, height: size } : {}),
        } as React.CSSProperties
      }
      className={`rank-glow-avatar ${isNeon ? 'rank-neon' : ''} ${className}`}
    >
      <img src={avatar ?? ''} alt={username} className="w-full h-full object-cover rounded-[10px]" />
    </div>
  )
}

/**
 * Reputation Display - �-tibar puan�-n�- renkli +�ekilde g+�ster
 */
export interface ReputationDisplayProps {
  reputation: number
  className?: string
}

export const ReputationDisplay: React.FC<ReputationDisplayProps> = ({ reputation, className = '' }) => {
  const reputationClass =
    reputation === 0
      ? 'reputation-zero'
      : reputation > 100
        ? 'reputation-high'
        : 'reputation-medium'

  return (
    <div className={`reputation-display ${reputationClass} ${className}`}>
      <span className="-mono">ԡ� {reputation.toLocaleString('tr-TR')}</span>
    </div>
  )
}

/**
 * Kullan�-c�- Profil Kart�- - Tam entegrasyon
 */
export interface UserProfileCardProps {
  user: {
    id: string
    username: string
    avatar?: string
    reputation?: number
    rank?: {
      name: string
      color: string
      isNeon?: boolean
    }
  }
  className?: string
}

export const UserProfileCard: React.FC<UserProfileCardProps> = ({ user, className = '' }) => {
  const defaultAvatar = 'https://via.placeholder.com/64?text=' + (user.username?.[0] || '?').toUpperCase()

  return (
    <div className={`flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 ${className}`}>
      {/* Avatar */}
      <RankglowAvatar
        avatar={user.avatar || defaultAvatar}
        username={user.username}
        rankColor={user.rank?.color}
        isNeon={user.rank?.isNeon}
        className="w-16 h-16"
      />

      {/* Bilgiler */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-lg font-bold text-white">{user.username}</h3>
          {user.rank && <span className="text-xs px-2 py-1 rounded bg-white/10 text-white">{user.rank.name}</span>}
        </div>
        {user.reputation !== undefined && <ReputationDisplay reputation={user.reputation} />}
      </div>
    </div>
  )
}
