'use client';

import { ChevronRight, Play } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ConnectWallet } from '@/components/ConnectWallet';

export default function KrillTubeLanding() {
  return (
    <div className="min-h-screen bg-black">
      {/* Hero Background */}
      <div className="relative min-h-screen bg-sky-800">
        {/* Ocean Background Image - positioned to start from top */}
        <Image
          src="/image 13.png"
          alt="Ocean background"
          width={1440}
          height={1024}
          className="absolute left-0 top-14 w-full h-auto object-cover"
          priority
        />

        {/* Navbar */}
        <nav className="relative top-0 left-0 right-0 bg-[#1E40AF] border-b-[6px] border-black p-3 md:px-24 z-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-8 lg:gap-16">
              <Link href="/" className="bg-black rounded-full px-6 py-2">
                <span className="text-white font-bold text-lg">LOGO</span>
              </Link>
              <div className="hidden md:block bg-white/20 backdrop-blur-md outline outline-[3px] outline-black rounded-[48px] p-2">
                <div className="flex gap-2">
                  {[
                    { label: 'Home', href: '/' },
                    { label: 'Watch', href: '/home' },
                    { label: 'Earn', href: '#perks' },
                    { label: 'Meme', href: '#playbook' },
                    { label: 'About', href: '#faq' }
                  ].map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`px-4 py-2 rounded-full font-medium transition-all ${
                        item.label === 'Home'
                          ? 'bg-red-600 text-white'
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
                className="bg-white text-black font-bold px-4 md:px-6 py-2 rounded-[32px] outline outline-[3px] outline-black hover:shadow-[3px_3px_0_1px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm md:text-base"
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
        <div className="relative pt-32 md:pt-48 pb-32 px-4 md:px-8 lg:px-28">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Left side - Text content */}
            <div className="w-full lg:w-[600px] p-6 bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-start items-start gap-4 overflow-hidden">
              <h1 className="self-stretch justify-start text-black text-5xl font-normal font-['Outfit'] leading-tight">
                Fuel the Ocean. Empower Creators.
              </h1>
              <p className="self-stretch justify-start text-red-600 text-base font-medium font-['Outfit']">
                A decentralized video ocean where fans fuel creation.<br />
                Powered by Walrus, driven by krill.
              </p>
            </div>
          </div>

          {/* CTA Buttons - positioned separately below */}
          <div className="absolute left-4 md:left-28 top-[420px] md:top-[516px] flex flex-wrap gap-4">
            <Link
              href="/home"
              className="bg-red-600 text-white font-semibold px-6 py-4 rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all inline-flex items-center gap-2"
            >
              Start Watching <Play className="w-5 h-5" fill="white" />
            </Link>
            <button
              className="bg-white text-black font-semibold px-6 py-4 rounded-[32px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] outline outline-2 outline-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all inline-flex items-center gap-2"
            >
              Learn More <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Card - overlapping the bottom */}
        <div className="absolute bottom-[-15px] left-1/2 -translate-x-1/2 z-50 px-4">
          <div className="w-[808px] px-8 py-6 bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1)] outline outline-2 outline-black inline-flex justify-between items-start overflow-hidden">
            <div className="flex-1 inline-flex flex-col justify-start items-start">
              <div className="self-stretch text-center justify-start text-black text-5xl font-extrabold font-['Outfit'] leading-[66px]">+7000</div>
              <div className="self-stretch text-center justify-start text-black text-lg font-medium font-['Outfit'] leading-7">Uploaded Content</div>
            </div>
            <div className="flex-1 inline-flex flex-col justify-start items-start">
              <div className="self-stretch text-center justify-start text-black text-5xl font-extrabold font-['Outfit'] leading-[66px]">+37</div>
              <div className="self-stretch text-center justify-start text-black text-lg font-medium font-['Outfit'] leading-7">Payments made</div>
            </div>
            <div className="flex-1 inline-flex flex-col justify-start items-center">
              <div className="self-stretch text-center justify-start text-black text-5xl font-extrabold font-['Outfit'] leading-[66px]">+15</div>
              <div className="self-stretch text-center justify-start text-black text-lg font-medium font-['Outfit'] leading-7">Volume</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gradient Section with rounded top */}
      <div className="relative bg-gradient-to-br from-sky-700 via-sky-700 to-cyan-500 pt-32 pb-20 rounded-tl-[80px] rounded-tr-[80px] -mt-20">
        {/* Recommendations Carousel */}
        <div className="w-full mx-auto inline-flex flex-col justify-start items-center gap-2 overflow-hidden">
          <div className="justify-start text-[#FFF] text-[32px] font-normal font-['Outfit'] leading-normal">Recommendations</div>
          <div className="relative w-full">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="inline-flex justify-start items-center gap-6 px-4 animate-scroll">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="p-4 bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-start items-center gap-2.5 overflow-hidden flex-shrink-0">
                    <div className="w-96 flex flex-col justify-start items-start gap-6">
                      <img className="self-stretch h-60 rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-black" src="https://placehold.co/392x237" alt={`Video ${i + 1}`} />
                      <div className="self-stretch flex flex-col justify-start items-start gap-2">
                        <div className="justify-start text-black text-base font-semibold font-['Outfit'] [text-shadow:_0px_5px_10px_rgb(0_0_0_/_0.25)]">Walrus</div>
                        <div className="self-stretch inline-flex justify-between items-start">
                          <div className="inline-flex flex-col justify-start items-start gap-2">
                            <div className="justify-start text-black text-2xl font-bold font-['Outfit']">Haulout Hackathon</div>
                            <div className="self-stretch justify-start text-black text-sm font-normal font-['Outfit']">Stand a chance to win</div>
                          </div>
                          <div className="w-12 h-12 p-3 bg-black rounded-3xl flex justify-start items-center gap-[5px]">
                            <Play className="w-6 h-6 text-white" fill="white" />
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
        <section id="playbook" className="relative flex justify-center items-center px-4 md:px-8 py-20">
          <div className="w-[1152.91px] h-[1092.63px] relative">
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
              <div className="justify-start text-black text-3xl font-normal font-['Outfit']">Playbook</div>
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
        <section id="perks" className="relative flex justify-center items-center px-4 md:px-8 py-20">
          <div className="w-[1224px] inline-flex flex-col justify-start items-start gap-3.5">
            <div className="self-stretch inline-flex justify-center items-center gap-2.5">
              <div className="flex-1 text-center justify-start text-white text-3xl font-normal font-['Outfit']">Perks</div>
            </div>
            <div className="self-stretch p-6 rounded-[32px] outline outline-[3px] outline-offset-[-3px] outline-black flex flex-col justify-start items-start gap-2.5 relative">
              {/* Walrus Mascot - positioned at top right */}
              <img className="w-24 h-24 origin-top-left rotate-[0.73deg] absolute -top-4 -right-4 z-10" src="/b3d06289-17f3-442d-b9cc-7de63a8e1214-removebg-preview 1.png" alt="Walrus Mascot" />

              <div className="self-stretch inline-flex justify-start items-center gap-6">
                <div className="flex-1 h-64 p-6 bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-start items-start gap-4 overflow-hidden">
                  <div className="self-stretch text-center justify-start text-black text-3xl font-semibold font-['Outfit']">Unbeatable Low Fees</div>
                  <div className="self-stretch justify-start text-[#E63946] text-base font-medium font-['Outfit']">Enjoy a pricing structure designed to maximize your earnings and savings. Our platform offers significantly lower transaction and service fees compared to other leading competitors, ensuring you keep more of what you earn.</div>
                </div>
                <div className="flex-1 h-64 p-6 bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-start items-start gap-4 overflow-hidden">
                  <div className="self-stretch text-center justify-start text-black text-3xl font-semibold font-['Outfit']">Powered by Walrus</div>
                  <div className="self-stretch justify-start text-[#E63946] text-base font-medium font-['Outfit']">Enjoy a pricing structure designed to maximize your earnings and savings. Our platform offers significantly lower transaction and service fees compared to other leading competitors, ensuring you keep more of what you earn.</div>
                </div>
                <div className="flex-1 h-64 p-6 bg-white rounded-2xl shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black inline-flex flex-col justify-start items-start gap-4 overflow-hidden">
                  <div className="self-stretch text-center justify-start text-black text-3xl font-semibold font-['Outfit']">Built on Sui Ecosystem</div>
                  <div className="self-stretch justify-start text-[#E63946] text-base font-medium font-['Outfit']">Enjoy a pricing structure designed to maximize your earnings and savings. Our platform offers significantly lower transaction and service fees compared to other leading competitors, ensuring you keep more of what you earn.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="flex justify-center items-center px-4 md:px-8 py-20">
          <div className="w-[1221px] p-12 bg-[#ffeee5] rounded-[20px] shadow-[5px_5px_0px_1px_rgba(0,0,0,1.00)] outline outline-[3px] outline-offset-[-3px] outline-black inline-flex flex-col justify-start items-center gap-12 relative">
            {/* Decorative image - positioned to the right of the title */}
            <img className="w-44 h-44 absolute -top-16 right-32" src="/47457298-c279-46a7-9d48-e0a9ed829bee 1.png" alt="Decoration" />

            <div className="self-stretch text-center justify-start text-[#E63946] text-3xl font-bold font-['Outfit']">Frequently Asked Questions (FAQs)</div>
            <div className="self-stretch flex flex-col justify-start items-start gap-3">
              {[
                { q: 'What is KrillTube?', a: 'KrillTube is a decentralized video platform powered by Walrus storage and built on the Sui blockchain.' },
                { q: 'How do I earn Krill?', a: 'You can earn Krill by uploading content, watching videos, and participating in the community.' },
                { q: 'What are the fees?', a: 'KrillTube offers unbeatable low fees compared to traditional platforms, with transparent pricing.' },
                { q: 'Is my content secure?', a: 'Yes, all content is stored on decentralized Walrus storage with encryption for maximum security.' },
                { q: 'How do I get started?', a: 'Simply connect your wallet and start watching or uploading content to join the ocean!' }
              ].map((faq, i) => (
                <details key={i} className="self-stretch p-6 bg-white rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black flex flex-col justify-start items-start gap-6 group">
                  <summary className="self-stretch inline-flex justify-start items-center gap-6 cursor-pointer list-none">
                    <div className="flex-1 flex justify-center items-center gap-2.5">
                      <div className="flex-1 justify-start text-black text-2xl font-semibold font-['Outfit']">{faq.q}</div>
                    </div>
                    <div className="w-12 h-12 px-5 py-4 bg-[#4A9FD8] rounded-[30px] shadow-[3px_3px_0px_0px_rgba(0,0,0,1.00)] outline outline-2 outline-offset-[-2px] outline-black flex justify-center items-center gap-2.5">
                      <img src="/Vector 2.svg" alt="Expand" className="w-[23px] h-[14px] transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <p className="text-black text-base font-medium font-['Outfit'] leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>

            {/* Mascot bottom right */}
            <img className="w-32 h-32 absolute bottom-4 right-[-96px]" src="/de80009084a8013aaa868412bd3bcab96e4eff19.png" alt="Mascot" />
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 md:px-8 py-12 flex justify-center items-center">
        <div className="w-[1224px] inline-flex flex-col justify-start items-start gap-4">
          <div className="self-stretch h-0 outline outline-2 outline-offset-[-1px] outline-black"></div>
          <div className="self-stretch inline-flex justify-between items-center">
            <div className="justify-start text-black text-3xl font-bold font-['Outfit']">LOGO</div>
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
