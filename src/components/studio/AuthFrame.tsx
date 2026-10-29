import Image from "next/image";
import type { ReactNode } from "react";
import VoiceMark from "./VoiceMark";
export default function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <main className="studio-auth">
      <header className="studio-auth-brand">
        <Image src="/barabari_logo.png" width={36} height={36} alt="" />
        <span>Samvaad Saathi</span>
      </header>
      <div className="studio-auth-layout">
        <aside className="studio-auth-story">
          <p className="studio-eyebrow">A place to practise</p>
          <h2>
            Find your words.
            <br />
            Make them count.
          </h2>
          <VoiceMark />
          <p>Speak. Reflect. Try again.</p>
          <ol>
            <li>
              <span>01</span>Practise a full interview
            </li>
            <li>
              <span>02</span>Work on one speaking skill
            </li>
            <li>
              <span>03</span>Turn feedback into your next step
            </li>
          </ol>
        </aside>
        <section className="studio-auth-form">
          <p className="studio-eyebrow">Welcome to your studio</p>
          <h1>{title}</h1>
          {description && <p className="studio-description">{description}</p>}
          <div className="mt-8">{children}</div>
        </section>
      </div>
      <footer className="studio-auth-footer">
        The Barabari Collective <span>Taleem. Tajurba. Taaqat.</span>
      </footer>
    </main>
  );
}
