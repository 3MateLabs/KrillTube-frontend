'use client';

import { ChevronRight, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ConnectWallet } from '@/components/ConnectWallet';

export default function KrillTubeLanding() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero Background */}
      <div className="relative pb-32 bg-sky-800">
        {/* Ocean Background Image - extends to cover full area */}
        <div className="absolute inset-0 w-full min-h-full">
          <Image
            src="/landing/krilltube_bg.png"
            alt="Ocean background"
            width={1440}
            height={1024}
            className="w-full h-full min-h-[900px] object-cover object-right"
            priority
          />
        </div>

        {/* Krill Mascot - layered on top of background, hidden on small screens */}
        <Image
          src="/landing/krill_mascot.png"
          alt="Krill mascot"
          width={600}
          height={600}
          className="hidden lg:block absolute right-8 xl:right-24 bottom-24 xl:bottom-32 w-[420px] xl:w-[480px] h-auto object-contain z-[5] pointer-events-none"
          priority
        />

        {/* Navbar */}
        <nav className="relative top-0 left-0 right-0 bg-[#1AAACE] border-b-[6px] border-black p-3 md:px-24 z-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8 lg:gap-16">
              <Link href="/" className="bg-black rounded-full px-4 py-2 flex items-center gap-2">
                <Image src="/logos/kril_tube_icon.png" alt="Krill Tube" width={32} height={32} className="rounded-full" />
                <span className="text-white font-bold text-lg">Krill Tube</span>
              </Link>
              <div className="hidden md:block bg-black backdrop-blur-md outline outline-[3px] outline-black rounded-[48px] p-2">
                <div className="flex gap-2">
                  {[
                    { label: 'Home', href: '/' },
                    { label: 'Watch', href: '/watch' },
                    { label: 'Earn', href: '#perks' },
                    { label: 'Meme', href: '#playbook' },
                    { label: 'About', href: '#faq' }
                  ].map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`px-4 py-2 rounded-full font-medium transition-all ${
                        item.label === 'Home'
                          ? 'bg-[#CF2C2F] text-white'
                          : 'text-white hover:bg-white/20'
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <Link
                href="/upload"
                className="bg-white text-black font-bold px-6 py-2 rounded-[32px] outline outline-[3px] outline-black hover:shadow-[3px_3px_0_1px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-base w-[86px] whitespace-nowrap flex items-center justify-center"
              >
                Upload
              </Link>
              <div className="hidden md:block">
                <ConnectWallet />
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative pt-16 md:pt-24 lg:pt-32 pb-12 md:pb-16 px-4 md:px-8 lg:px-16 xl:px-28 z-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 lg:gap-12">
              {/* Left side - Text and buttons */}
              <div className="flex flex-col gap-6 lg:max-w-[600px]">
                {/* Text content */}
                <div className="w-full p-6 md:p-8 bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1)] outline outline-2 outline-offset-[-2px] outline-black flex flex-col gap-4">
                  <h1 className="text-black text-3xl md:text-4xl lg:text-5xl font-normal font-['Aclonica'] leading-tight">
                    Fuel the Ocean. Empower Creators.
                  </h1>
                  <p className="text-red-600 text-sm md:text-base font-medium font-['Outfit']">
                    A decentralized video ocean where fans fuel creation.<br />
                    Powered by Walrus, driven by krill.
                  </p>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/watch"
                    className="bg-[#EF4330] text-white font-semibold px-6 py-3 md:py-4 rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all inline-flex items-center gap-2 text-sm md:text-base"
                  >
                    Start Watching
                    <div className="w-6 h-6 md:w-7 md:h-7 p-1 md:p-1.5 bg-black rounded-full flex justify-center items-center">
                      <Play className="w-3 h-3 md:w-4 md:h-4 text-white" fill="white" />
                    </div>
                  </Link>
                  <button
                    className="bg-white text-black font-semibold px-6 py-3 md:py-4 rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all inline-flex items-center gap-2 text-sm md:text-base"
                  >
                    Learn More
                    <div className="w-6 h-6 md:w-7 md:h-7 p-1 md:p-1.5 bg-black rounded-full flex justify-center items-center">
                      <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-white rotate-90" />
                    </div>
                  </button>
                </div>
              </div>

              {/* Right side - Space for mascot on large screens */}
              <div className="hidden lg:block lg:flex-1"></div>
            </div>
          </div>
        </div>

        {/* Stats Card - positioned at bottom */}
        <div className="relative left-1/2 -translate-x-1/2 z-10 px-4 mt-6 md:mt-8 pb-6">
          <div className="w-full max-w-[808px] mx-auto px-4 md:px-8 py-4 md:py-6 bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1)] outline outline-2 outline-black flex justify-between items-start gap-2">
            <div className="flex-1 flex flex-col justify-start items-start">
              <div className="w-full text-center text-black text-3xl md:text-4xl lg:text-5xl font-extrabold font-['Outfit'] leading-tight md:leading-[66px]">+7000</div>
              <div className="w-full text-center text-black text-sm md:text-base lg:text-lg font-medium font-['Outfit'] leading-snug md:leading-7">Uploaded Content</div>
            </div>
            <div className="flex-1 flex flex-col justify-start items-start">
              <div className="w-full text-center text-black text-3xl md:text-4xl lg:text-5xl font-extrabold font-['Outfit'] leading-tight md:leading-[66px]">+37</div>
              <div className="w-full text-center text-black text-sm md:text-base lg:text-lg font-medium font-['Outfit'] leading-snug md:leading-7">Payments made</div>
            </div>
            <div className="flex-1 flex flex-col justify-start items-center">
              <div className="w-full text-center text-black text-3xl md:text-4xl lg:text-5xl font-extrabold font-['Outfit'] leading-tight md:leading-[66px]">+15</div>
              <div className="w-full text-center text-black text-sm md:text-base lg:text-lg font-medium font-['Outfit'] leading-snug md:leading-7">Volume</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gradient Section with rounded top */}
      <div className="relative pt-20 pb-20 rounded-tl-[80px] rounded-tr-[80px] outline outline-[4px] outline-black -mt-20" style={{background: 'linear-gradient(131deg, #00579B 0%, #0B79B0 44%, #1AAACE 100%)'}}>
        {/* Recommendations Carousel */}
        <div className="w-full mx-auto flex flex-col items-center gap-4 md:gap-6 overflow-hidden">
          <h2 className="text-white text-2xl md:text-3xl font-bold font-['Fredoka'] text-center">Recommendations</h2>
          <div className="relative w-full">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-4 md:gap-6 px-4 animate-scroll">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="p-3 md:p-4 bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1)] outline outline-2 outline-offset-[-2px] outline-black flex flex-col gap-2 md:gap-2.5 flex-shrink-0 w-[280px] md:w-[320px] lg:w-[392px]">
                    <div className="w-full flex flex-col gap-4 md:gap-6">
                      <img className="w-full h-40 md:h-48 lg:h-60 rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-black object-cover" src="https://i.imgur.com/pkTKVOL.png" alt={`Video ${i + 1}`} />
                      <div className="w-full flex flex-col gap-2">
                        <div className="text-black text-sm md:text-base font-semibold font-['Outfit']">Walrus</div>
                        <div className="w-full flex justify-between items-start gap-2">
                          <div className="flex flex-col gap-1 md:gap-2 flex-1">
                            <div className="text-black text-lg md:text-xl lg:text-2xl font-bold font-['Outfit'] line-clamp-2">Walrus Haulout Hackathon</div>
                            <div className="text-black text-xs md:text-sm font-normal font-['Outfit']">Stand a chance to win</div>
                          </div>
                          <div className="w-10 h-10 md:w-12 md:h-12 p-2 md:p-3 bg-black rounded-3xl flex justify-center items-center flex-shrink-0">
                            <Play className="w-5 h-5 md:w-6 md:h-6 text-white" fill="white" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Playbook Section */}
        <section id="playbook" className="relative flex justify-center items-center px-4 md:px-8 py-12 md:py-20">
          {/* Mobile/Tablet Simplified Layout */}
          <div className="w-full max-w-[1200px] mx-auto xl:hidden">
            <h2 className="text-black text-2xl md:text-3xl font-bold font-['Fredoka'] text-center mb-8 flex items-center justify-center gap-2">
              Playbook
              <img className="w-12 h-12 md:w-16 md:h-16" src="/image 16.png" alt="Ship" />
            </h2>

            <div className="w-full flex flex-col gap-4 p-4 md:p-6 bg-[#ffeee5] rounded-[24px] md:rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-black mx-auto">
              {[
                { title: "Fueler", desc: "Watch Content on Krill.tube and fuel the ocean by feeding whales with Krill (small payments)." },
                { title: "Whale", desc: "Feed your inner whale — upload on Krill.tube and earn Krill to fill that humongous belly!" },
                { title: "Cashfish", desc: "Scavenge rewards from watching content on krill.tube based on how much fuel you provide." },
                { title: "Krilly", desc: "Krilly is the glowing heart of KrillTube: a living spark of creative energy swimming through the decentralized ocean. It teaches users that every view, every krill, and every Tube matters. Friendly enough to guide first-time viewers, symbolic enough to represent the future of creator economies." }
              ].map((item, i) => (
                <div key={i} className="w-full px-4 md:px-8 py-4 md:py-6 bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-2 outline-black">
                  <h3 className="text-black text-lg md:text-xl font-bold font-['Outfit'] mb-2">{item.title}</h3>
                  <p className="text-black text-sm md:text-base font-medium font-['Outfit']">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Complex Layout */}
          <div className="hidden xl:block w-[1152.91px] h-[1092.63px] relative mx-auto">
            {/* Main Background Container */}
            <div className="w-[889px] h-[943px] left-[211px] top-[97px] absolute bg-[#ffeee5] rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] border-[3px] border-black" />

            {/* Fueler Card */}
            <div className="px-8 py-6 left-[266px] top-[218.69px] absolute origin-top-left rotate-[-3.78deg] bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-2 outline-black inline-flex justify-start items-start gap-3 overflow-hidden">
              <div className="w-[708.41px] text-center justify-start text-black text-2xl font-semibold font-['Outfit']">
                Fueler<br/>Watch Content on Krill.tube and fuel the ocean by feeding whales with Krill (small payments).
              </div>
            </div>

            {/* Whale Card */}
            <div className="px-8 py-6 left-[275px] top-[344px] absolute origin-top-left rotate-[3.34deg] bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-2 outline-black inline-flex justify-start items-start gap-3 overflow-hidden">
              <div className="w-[708.05px] text-center justify-start text-black text-2xl font-semibold font-['Outfit']">
                Whale<br/>Feed your inner whale — upload on Krill.tube and earn Krill to fill that humongous belly!
              </div>
            </div>

            {/* Cashfish Card */}
            <div className="px-8 py-6 left-[267px] top-[551.01px] absolute origin-top-left rotate-[-3.14deg] bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-2 outline-black inline-flex justify-start items-start gap-3 overflow-hidden">
              <div className="w-[707.87px] text-center justify-start text-black text-2xl font-semibold font-['Outfit']">
                Cashfish<br/>Scavenge rewards from watching content on krill.tube based on how much fuel you provide.
              </div>
            </div>

            {/* Krilly Card */}
            <div className="px-8 py-6 left-[279.08px] top-[675px] absolute origin-top-left rotate-[3.90deg] bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-2 outline-black inline-flex justify-start items-start gap-3 overflow-hidden">
              <div className="w-[716.66px] text-center justify-start text-black text-2xl font-semibold font-['Outfit']">
                Krilly<br/>Krilly is the glowing heart of KrillTube: a living spark of creative energy swimming through the decentralized ocean.<br/>It teaches users that every view, every krill, and every Tube matters.<br/>Friendly enough to guide first-time viewers, symbolic enough to represent the future of creator economies.
              </div>
            </div>

            {/* Decorative Images - Diver on right */}
            <img className="w-40 h-40 left-[1130.08px] top-[426.76px] absolute origin-top-left rotate-[179.20deg]" src="/image 14.png" alt="Diver" />

            {/* Title - Playbook */}
            <div className="left-[547px] top-[113px] absolute inline-flex justify-start items-center gap-[5px]">
              <div style={{color: 'var(--black, black)', fontSize: 32, fontFamily: 'Fredoka', fontWeight: '700', wordWrap: 'break-word'}}>Playbook</div>
              <img className="w-16 h-16" src="/image 16.png" alt="Ship" />
            </div>

            {/* Decorative whale on left */}
            <img className="w-80 h-52 left-[42px] top-[435.91px] absolute origin-top-left rotate-[-5.82deg]" src="/image 19.png" alt="Whale" />

            {/* Decorative krill on right bottom */}
            <img className="w-44 h-64 left-[982.67px] top-[586px] absolute origin-top-left rotate-[4.85deg]" src="/5069c277-0b29-4b81-af8d-60fac24c0152 1 (1).png" alt="Krill" />

            {/* Decorative krill bottom left */}
            <img className="w-36 h-36 left-[245px] top-[834px] absolute" src="/8f2cdf3a-f931-47df-83da-b500690d0a45 1.png" alt="Krill" />

            {/* Blue circle decoration */}
            <div className="w-12 h-12 p-3.5 left-[266px] top-[121px] absolute bg-[#4A9FD8] rounded-3xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-1 outline-offset-[-1px] outline-black inline-flex justify-start items-center gap-2.5">
              <div className="w-5 h-5 bg-black rounded-full" />
            </div>

            {/* Decorative anchor bottom right */}
            <img className="w-32 h-32 left-[828px] top-[960.10px] absolute origin-top-left rotate-[-12.80deg]" src="/aa478006-7a38-4d2c-ab82-341c4194efe1 1.png" alt="Anchor" />

            {/* Mascot bottom left */}
            <img className="w-32 h-32 left-[-70px] top-[850px] absolute" src="/de80009084a8013aaa868412bd3bcab96e4eff19.png" alt="Mascot" />
          </div>
        </section>

        {/* Perks Section */}
        <section id="perks" className="relative flex justify-center items-center px-4 md:px-8 py-12 md:py-20">
          <div className="w-full max-w-[1224px] flex flex-col gap-6 md:gap-8">
            <div className="w-full flex justify-center items-center relative">
              <h2 className="text-white text-2xl md:text-3xl font-bold font-['Fredoka'] text-center">Perks</h2>
              {/* Walrus Mascot - positioned at top right of title */}
              <img className="hidden lg:block w-20 h-20 lg:w-24 lg:h-24 absolute -top-8 -right-8 z-10" src="/b3d06289-17f3-442d-b9cc-7de63a8e1214-removebg-preview 1.png" alt="Walrus Mascot" />
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="w-full min-h-[240px] p-4 md:p-6 bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black flex flex-col gap-3 md:gap-4">
                <h3 className="text-black text-xl md:text-2xl lg:text-3xl font-semibold font-['Outfit'] text-center">Unbeatable Low Fees</h3>
                <p className="text-[#E63946] text-sm md:text-base font-medium font-['Outfit']">Enjoy a pricing structure designed to maximize your earnings and savings. Our platform offers significantly lower transaction and service fees compared to other leading competitors, ensuring you keep more of what you earn.</p>
              </div>
              <div className="w-full min-h-[240px] p-4 md:p-6 bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black flex flex-col gap-3 md:gap-4">
                <h3 className="text-black text-xl md:text-2xl lg:text-3xl font-semibold font-['Outfit'] text-center">Powered by Walrus</h3>
                <p className="text-[#E63946] text-sm md:text-base font-medium font-['Outfit']">Enjoy a pricing structure designed to maximize your earnings and savings. Our platform offers significantly lower transaction and service fees compared to other leading competitors, ensuring you keep more of what you earn.</p>
              </div>
              <div className="w-full min-h-[240px] p-4 md:p-6 bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black flex flex-col gap-3 md:gap-4">
                <h3 className="text-black text-xl md:text-2xl lg:text-3xl font-semibold font-['Outfit'] text-center">Built on Sui Ecosystem</h3>
                <p className="text-[#E63946] text-sm md:text-base font-medium font-['Outfit']">Enjoy a pricing structure designed to maximize your earnings and savings. Our platform offers significantly lower transaction and service fees compared to other leading competitors, ensuring you keep more of what you earn.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="flex justify-center items-center px-4 md:px-8 py-12 md:py-20">
          <div className="w-full max-w-[1221px] p-4 md:p-8 lg:p-12 bg-[#ffeee5] rounded-[20px] md:rounded-[32px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col items-center gap-6 md:gap-8 lg:gap-12 relative">
            {/* Decorative image - hidden on mobile, positioned on larger screens */}
            <img className="hidden lg:block w-32 h-32 lg:w-44 lg:h-44 absolute -top-12 lg:-top-16 right-16 lg:right-32" src="/47457298-c279-46a7-9d48-e0a9ed829bee 1.png" alt="Decoration" />

            <h2 className="w-full text-center text-[#E63946] text-xl md:text-2xl lg:text-3xl font-bold font-['Fredoka']">Frequently Asked Questions (FAQs)</h2>
            <div className="w-full flex flex-col gap-3 md:gap-4">
              {[
                { q: 'What is KrillTube?', a: 'KrillTube is a decentralized video platform powered by Walrus storage and built on the Sui blockchain.' },
                { q: 'How do I earn Krill Points?', a: 'You can earn Krill Points by uploading content, watching videos, and participating in the community.' },
                { q: 'What are the fees?', a: 'KrillTube offers unbeatable low fees compared to traditional platforms, with transparent pricing.' },
                { q: 'Is my content secure?', a: 'Yes, all content is stored on decentralized Walrus storage with encryption for maximum security.' },
                { q: 'How do I get started?', a: 'Simply connect your wallet and start watching or uploading content to join the ocean!' }
              ].map((faq, i) => (
                <details key={i} className="w-full p-4 md:p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black flex flex-col gap-4 md:gap-6 group">
                  <summary className="w-full flex justify-between items-center gap-3 md:gap-6 cursor-pointer list-none">
                    <div className="flex-1 text-black text-base md:text-xl lg:text-2xl font-semibold font-['Outfit']">{faq.q}</div>
                    <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-[#4A9FD8] rounded-[24px] md:rounded-[30px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black flex justify-center items-center flex-shrink-0">
                      <img src="/Vector 2.svg" alt="Expand" className="w-[20px] h-[14px] md:w-[30px] md:h-[20px] transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <p className="text-black text-sm md:text-base font-medium font-['Outfit'] leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>

            {/* Mascot bottom right - hidden on mobile and medium screens */}
            <img className="hidden xl:block w-32 h-32 absolute bottom-4 right-[-96px]" src="/de80009084a8013aaa868412bd3bcab96e4eff19.png" alt="Mascot" />
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 md:px-8 py-12 flex justify-center items-center">
        <div className="w-[1224px] inline-flex flex-col justify-start items-start gap-4">
          <div className="self-stretch h-0 outline outline-2 outline-offset-[-1px] outline-black"></div>
          <div className="self-stretch inline-flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Image src="/logos/kril_tube_icon.png" alt="Krill Tube" width={40} height={40} className="rounded-full" />
              <div className="justify-start text-white text-3xl font-bold font-['Outfit']">Krill Tube</div>
            </div>
            <div className="flex justify-start items-center gap-4">
              <div className="justify-start text-white text-xl font-medium font-['Outfit']">2025. All rights reserved.</div>
              <div className="flex justify-start items-center gap-2.5">
                {[
                  { label: 'LinkedIn', href: '#', icon: '/simple-icons_linkedin.svg' },
                  { label: 'Instagram', href: '#', icon: '/ant-design_instagram-outlined.svg' },
                  { label: 'Facebook', href: '#', icon: '/bi_facebook.svg' },
                  { label: 'Twitter', href: '#', icon: '/devicon_twitter.svg' }
                ].map(({ label, href, icon }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="w-6 h-6 flex items-center justify-center hover:opacity-80 transition-opacity"
                  >
                    <img src={icon} alt={label} className="w-6 h-6" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
        </footer>
      </div>
    </div>
  );
}
