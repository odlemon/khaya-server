// @ts-nocheck
import { PricingEntry } from "../models/PricingEntry";
import { Types } from "mongoose";

export async function createSamplePricingForFirm(firmId: Types.ObjectId) {
  const samples = [
    {
      firmId,
      name: "Drafting Complaint Q1 2024",
      taskDescription: "Drafting an initial complaint for a breach of contract case, including legal research and fact investigation.",
      caseType: "Civil Litigation",
      lawyerRole: "Attorney",
      period: "Q1 2024",
      outcome: "Complaint filed with the court",
      price: 1200,
      notes: "Includes client interview, review of supporting documents, and preparation of a detailed complaint. Typical US pricing for this service ranges from $1,000 to $1,500."
    },
    {
      firmId,
      name: "Deposition Preparation Q1 2024",
      taskDescription: "Preparing a client for deposition in a personal injury matter, including mock questioning and review of case facts.",
      caseType: "Personal Injury",
      lawyerRole: "Attorney",
      period: "Q1 2024",
      outcome: "Client prepared for deposition",
      price: 900,
      notes: "Covers attorney time for strategy, document review, and practice session. US market rates for this preparation typically range from $800 to $1,200."
    },
    {
      firmId,
      name: "Green Card Application Review Q2 2024",
      taskDescription: "Reviewing and finalizing a family-based green card application before submission to USCIS.",
      caseType: "Immigration",
      lawyerRole: "Attorney",
      period: "Q2 2024",
      outcome: "Application ready for submission",
      price: 700,
      notes: "Includes detailed review of forms, supporting evidence, and cover letter. Typical US pricing for this review is $500 to $1,000."
    },
    {
      firmId,
      name: "Drafting Will Q2 2024",
      taskDescription: "Drafting a simple will for an individual, including consultation and final signing session.",
      caseType: "Estate Planning",
      lawyerRole: "Attorney",
      period: "Q2 2024",
      outcome: "Will executed and delivered to client",
      price: 450,
      notes: "Fee covers initial consultation, drafting, and one revision. US pricing for a simple will typically ranges from $300 to $600."
    },
    {
      firmId,
      name: "Trademark Search Q1 2024",
      taskDescription: "Conducting a preliminary trademark search and providing a written opinion on registrability.",
      caseType: "Intellectual Property",
      lawyerRole: "Attorney",
      period: "Q1 2024",
      outcome: "Search report delivered to client",
      price: 400,
      notes: "Includes database search and written legal opinion. US market rates for this service are usually $300 to $500."
    },
    {
      firmId,
      name: "Drafting Lease Agreement Q2 2024",
      taskDescription: "Drafting a residential lease agreement tailored to landlord's requirements.",
      caseType: "Real Estate",
      lawyerRole: "Attorney",
      period: "Q2 2024",
      outcome: "Lease agreement delivered to client",
      price: 600,
      notes: "Includes client consultation and one round of revisions. Typical US pricing for lease drafting is $500 to $800."
    },
    {
      firmId,
      name: "Discovery Document Review Q1 2024",
      taskDescription: "Reviewing and summarizing 500 pages of discovery documents in a commercial litigation case.",
      caseType: "Commercial Litigation",
      lawyerRole: "Attorney",
      period: "Q1 2024",
      outcome: "Summary report provided to client",
      price: 950,
      notes: "Fee covers document review, issue spotting, and summary memo. US rates for this volume of review are typically $800 to $1,200."
    },
    {
      firmId,
      name: "Severance Agreement Review Q2 2024",
      taskDescription: "Reviewing and advising on a severance agreement for an executive client.",
      caseType: "Employment Law",
      lawyerRole: "Attorney",
      period: "Q2 2024",
      outcome: "Advice memo and annotated agreement delivered",
      price: 750,
      notes: "Includes review of agreement, legal analysis, and written advice. US pricing for this service is generally $600 to $900."
    },
    {
      firmId,
      name: "LLC Operating Agreement Draft Q1 2024",
      taskDescription: "Drafting an operating agreement for a new LLC, including member consultation.",
      caseType: "Business Law",
      lawyerRole: "Attorney",
      period: "Q1 2024",
      outcome: "Operating agreement delivered to client",
      price: 850,
      notes: "Fee covers drafting, consultation, and one revision. US market rates for this service are $700 to $1,000."
    },
    {
      firmId,
      name: "Child Custody Mediation Prep Q1 2024",
      taskDescription: "Preparing a client for child custody mediation, including strategy session and document review.",
      caseType: "Family Law",
      lawyerRole: "Attorney",
      period: "Q1 2024",
      outcome: "Client prepared for mediation",
      price: 650,
      notes: "Includes review of case file, coaching, and preparation of mediation statement. US pricing for this service is typically $500 to $800."
    }
  ];
  await PricingEntry.insertMany(samples);
} 