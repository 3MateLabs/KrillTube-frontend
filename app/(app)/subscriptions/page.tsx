'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Subscription {
  id: string;
  handle: string;
  displayName: string;
  subscriberCount: number;
  bio: string;
  avatarUrl?: string;
}

// Subscription Card Component
const SubscriptionCard = ({ subscription }: { subscription: Subscription }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="w-full bg-white rounded-[90px] shadow-[3px_3px_0_0_black] outline outline-[4px] outline-offset-0 outline-black flex items-center gap-5 hover:shadow-[5px_5px_0_0_black] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Avatar */}
      <div className="w-40 h-40 flex-shrink-0">
        <Image
          src={subscription.avatarUrl || '/d3h3d.svg'}
          alt={subscription.displayName}
          width={160}
          height={160}
          className="w-40 h-40 rounded-full border-[3px] border-black object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 py-3 pr-16 flex flex-col justify-between gap-2">
        {/* Display Name */}
        <div className="text-black text-xl font-semibold font-['Outfit']">
          {subscription.displayName}
        </div>

        {/* Handle and Subscribers */}
        <div className="flex items-center gap-1">
          <span className="text-black text-base font-medium font-['Outfit']">
            @{subscription.handle}
          </span>
          <span className="text-black text-base font-medium font-['Outfit']">
            •{subscription.subscriberCount} Subscribers
          </span>
        </div>

        {/* Bio */}
        <div className="text-black text-base font-normal font-['Outfit'] line-clamp-2">
          {subscription.bio}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5 mt-2">
          {/* Bell Button */}
          <button className="w-10 h-10 px-2 py-2.5 bg-white rounded-[20px] shadow-[3px_3px_0_0_black] outline outline-[2px] outline-offset-[-2px] outline-black flex items-center justify-center hover:shadow-[2px_2px_0_0_black] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Unsubscribe Button */}
          <button className="h-10 px-3 py-2.5 bg-black rounded-[20px] outline outline-[3px] outline-offset-[-3px] outline-black flex items-center justify-center hover:bg-[#333] transition-colors">
            <span className="text-white text-base font-bold font-['Outfit']">
              Unsubscribe
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default function SubscriptionsPage() {
  // Mock data - replace with actual data fetching
  const [subscriptions] = useState<Subscription[]>([
    {
      id: '1',
      handle: 'matteo.sui',
      displayName: 'Matteo.sui',
      subscriberCount: 356,
      bio: '@Eason_C13 @GiveRep We are grateful for the overwhelming support from the Sui Overflow community! @GiveRep @GiveRep',
      avatarUrl: '/d3h3d.svg',
    },
    {
      id: '2',
      handle: 'matteo.sui',
      displayName: 'Matteo.sui',
      subscriberCount: 356,
      bio: '@Eason_C13 @GiveRep We are grateful for the overwhelming support from the Sui Overflow community! @GiveRep @GiveRep',
      avatarUrl: '/d3h3d.svg',
    },
    {
      id: '3',
      handle: 'matteo.sui',
      displayName: 'Matteo.sui',
      subscriberCount: 356,
      bio: '@Eason_C13 @GiveRep We are grateful for the overwhelming support from the Sui Overflow community! @GiveRep @GiveRep',
      avatarUrl: '/d3h3d.svg',
    },
    {
      id: '4',
      handle: 'matteo.sui',
      displayName: 'Matteo.sui',
      subscriberCount: 356,
      bio: '@Eason_C13 @GiveRep We are grateful for the overwhelming support from the Sui Overflow community! @GiveRep @GiveRep',
      avatarUrl: '/d3h3d.svg',
    },
    {
      id: '5',
      handle: 'matteo.sui',
      displayName: 'Matteo.sui',
      subscriberCount: 356,
      bio: '@Eason_C13 @GiveRep We are grateful for the overwhelming support from the Sui Overflow community! @GiveRep @GiveRep',
      avatarUrl: '/d3h3d.svg',
    },
  ]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#00579B] via-[#0B79B0] to-[#1AAACE]">
      {/* Content Container */}
      <div className="max-w-[1016px] mx-auto px-4 pt-4 pb-12">
        {/* Page Title */}
        <h1 className="text-white text-[32px] font-semibold font-['Outfit'] text-center mb-5">
          Subscriptions
        </h1>

        {/* Subscriptions List */}
        <div className="flex flex-col gap-4">
          {subscriptions.map((subscription) => (
            <SubscriptionCard key={subscription.id} subscription={subscription} />
          ))}
        </div>

        {/* Empty State (if no subscriptions) */}
        {subscriptions.length === 0 && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No subscriptions yet</h3>
              <p className="text-white/80 mb-6">Subscribe to creators to see their content here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
