import React from "react";

type SectionCardProps = {
  title: string;
  children: React.ReactNode;
};

const SectionCard: React.FC<SectionCardProps> = ({ title, children }) => (
  <div className="studio-panel">
    <div className="space-y-4">
      <h2 className="card-title text-lg font-semibold">{title}</h2>
      <div className="text-base-content">{children}</div>
    </div>
  </div>
);

export default SectionCard;
