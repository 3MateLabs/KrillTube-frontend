'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 bottom-0 z-50 w-72 h-screen
          bg-[#0668A6] shadow-[0_4px_15px_rgba(42,42,42,0.31)] border-r-[3px] border-black backdrop-blur-[100px]
          transition-all duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="w-56 left-[29px] top-[18px] absolute inline-flex justify-start items-center gap-3">
          <div className="p-2 bg-black rounded-[32px] shadow-[3px_3px_0_0_black] outline outline-1 outline-offset-[-1px] outline-white inline-flex justify-center items-center">
            <div className="p-2 bg-black rounded-[32px] inline-flex justify-center items-center">
              <Image src="/logos/hamburger-menu.svg" alt="Menu" width={24} height={24} className="w-6 h-6" />
            </div>
          </div>
          <div className="flex-1 p-2 bg-black rounded-[32px] inline-flex flex-col justify-start items-start gap-2.5">
            <div className="self-stretch p-2 bg-black rounded-[32px] inline-flex justify-center items-center gap-2.5">
              <div className="justify-start text-white text-base font-bold font-['Outfit']">LOGO</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="w-56 left-[29px] top-[111px] absolute inline-flex flex-col justify-start items-start gap-4">
          {/* Main Menu */}
          <div className="self-stretch px-4 py-8 bg-[#FFEEE5] rounded-3xl outline outline-[3px] outline-offset-[-3px] outline-black backdrop-blur-[9.45px] flex flex-col justify-center items-center gap-2.5">
            <div className="self-stretch flex flex-col justify-center items-start gap-4">
              <Link
                href="/home"
                onClick={onClose}
                className="self-stretch px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg"
              >
                <Image src="/logos/home.svg" alt="Home" width={24} height={24} className="w-6 h-6" />
                <div className="justify-start text-black text-base font-semibold font-['Outfit']">Home</div>
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className="self-stretch px-4 py-2 bg-[#EF4330] rounded-[32px] outline outline-[3px] outline-offset-[-3px] outline-black inline-flex justify-start items-center gap-2.5"
              >
                <Image src="/logos/watch.svg" alt="Watch" width={24} height={24} className="w-6 h-6" />
                <div className="justify-start text-white text-base font-semibold font-['Outfit']">Watch</div>
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className="self-stretch px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg"
              >
                <Image src="/logos/playlist.svg" alt="Playlists" width={24} height={24} className="w-6 h-6" />
                <div className="justify-start text-black text-base font-semibold font-['Outfit']">Playlists</div>
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className="self-stretch px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg"
              >
                <Image src="/logos/about.svg" alt="About" width={24} height={24} className="w-6 h-6" />
                <div className="justify-start text-black text-base font-semibold font-['Outfit']">About</div>
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className="self-stretch px-4 py-2 rounded-[32px] outline outline-2 outline-offset-[-2px] outline-black inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors"
              >
                <Image src="/logos/subscriptions.svg" alt="Subscriptions" width={24} height={24} className="w-6 h-6" />
                <div className="justify-start text-black text-base font-semibold font-['Outfit']">Subscriptions</div>
              </Link>
            </div>
          </div>

          {/* Explore Menu */}
          <div className="self-stretch px-4 py-8 bg-[#FFEEE5] rounded-3xl outline outline-[3px] outline-offset-[-3px] outline-black backdrop-blur-[9.45px] flex flex-col justify-center items-center gap-2.5">
            <div className="self-stretch flex flex-col justify-center items-start gap-4">
              <div className="self-stretch px-4 pb-4 border-b-2 border-black inline-flex justify-center items-center gap-2.5">
                <div className="flex-1 justify-start text-black text-xl font-semibold font-['Outfit']">Explore</div>
                <div className="w-10 h-10 bg-black rounded-full flex justify-center items-center">
                  <Image src="/logos/explore.svg" alt="Explore" width={24} height={24} className="w-6 h-6" />
                </div>
              </div>

              <Link
                href="#"
                onClick={onClose}
                className="self-stretch px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg"
              >
                <Image src="/logos/photos.svg" alt="Photos" width={24} height={24} className="w-6 h-6" />
                <div className="justify-start text-black text-base font-semibold font-['Outfit']">Photos</div>
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className="self-stretch px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg"
              >
                <Image src="/logos/scrolls.svg" alt="Scrolls" width={24} height={24} className="w-6 h-6" />
                <div className="justify-start text-black text-base font-semibold font-['Outfit']">Scrolls</div>
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className="self-stretch px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg"
              >
                <Image src="/logos/meme.svg" alt="Meme" width={24} height={24} className="w-6 h-6" />
                <div className="justify-start text-black text-base font-semibold font-['Outfit']">Meme</div>
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className="self-stretch px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg"
              >
                <Image src="/logos/earn.svg" alt="Earn" width={24} height={24} className="w-6 h-6" />
                <div className="justify-start text-black text-base font-semibold font-['Outfit']">Earn</div>
              </Link>
            </div>
          </div>

          {/* User Menu */}
          <div className="self-stretch px-4 py-8 bg-[#FFEEE5] rounded-3xl outline outline-[3px] outline-offset-[-3px] outline-black backdrop-blur-[9.45px] flex flex-col justify-center items-center gap-2.5">
            <div className="self-stretch flex flex-col justify-center items-start gap-4">
              <Link
                href="/library"
                onClick={onClose}
                className="self-stretch px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg"
              >
                <Image src="/logos/your Uploads.svg" alt="Your Uploads" width={24} height={24} className="w-6 h-6" />
                <div className="justify-start text-black text-base font-semibold font-['Outfit']">Your Uploads</div>
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className="self-stretch px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg"
              >
                <Image src="/logos/send feedback.svg" alt="Send feedback" width={24} height={24} className="w-6 h-6" />
                <div className="justify-start text-black text-base font-semibold font-['Outfit']">Send feedback</div>
              </Link>

              <Link
                href="#"
                onClick={onClose}
                className="self-stretch px-4 py-2 inline-flex justify-start items-center gap-2.5 hover:bg-white/50 transition-colors rounded-lg"
              >
                <div className="w-6 h-6 relative overflow-hidden">
                  <div className="w-5 h-5 left-[1px] top-[1px] absolute bg-black" />
                </div>
                <div className="justify-start text-black text-base font-semibold font-['Outfit']">Setting</div>
              </Link>
            </div>
          </div>

          {/* User Profile */}
          <div className="self-stretch inline-flex justify-start items-start gap-3">
            <div className="w-12 h-12 px-3 py-px bg-black rounded-3xl shadow-[3px_3px_0_0_black] outline outline-1 outline-offset-[-1px] outline-white flex justify-center items-center gap-2.5">
              <div className="w-12 h-12 relative">
                <img className="w-12 h-12 left-0 top-0 absolute rounded-full border-2 border-white" src="https://via.placeholder.com/50" alt="User" />
              </div>
            </div>
            <div className="flex-1 p-2 bg-black rounded-[32px] outline outline-1 outline-offset-[-1px] outline-white inline-flex flex-col justify-start items-start gap-2.5">
              <div className="self-stretch p-2 bg-black rounded-[32px] inline-flex justify-center items-center gap-2.5">
                <div className="justify-start text-white text-base font-semibold font-['Montserrat']">@EasonC13</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
