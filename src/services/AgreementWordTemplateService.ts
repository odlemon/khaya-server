// @ts-nocheck
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import fs from 'fs';
import path from 'path';
import { IAgreement } from "../models/Agreement";
import { IUser } from "../models/User";
import { IProperty } from "../models/Property";
import { agreementTemplateMappingService } from "./AgreementTemplateMappingService";

/**
 * Service to generate Word documents from templates
 */
export class AgreementWordTemplateService {
  
  /**
   * Generate Word document from template
   */
  async generateAgreementDocument(
    templatePath: string,
    agreement: IAgreement,
    landlord: IUser,
    tenant: IUser,
    property: IProperty
  ): Promise<Buffer> {
    try {
      // Load template file
      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);
      
      // Initialize docxtemplater
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: '{{',
          end: '}}'
        }
      });
      
      // Map database fields to template placeholders
      const templateData = agreementTemplateMappingService.mapAgreementToTemplate(
        agreement,
        landlord,
        tenant,
        property
      );
      
      // Set data in template
      doc.setData(templateData);
      
      // Render document
      doc.render();
      
      // Generate buffer
      const buf = doc.getZip().generate({ 
        type: 'nodebuffer',
        compression: 'DEFLATE'
      });
      
      return buf;
    } catch (error: any) {
      // Enhanced error handling for docxtemplater
      if (error.properties && error.properties.errors instanceof Array) {
        const errorMessages = error.properties.errors
          .map((e: any) => `${e.name}: ${e.message}`)
          .join('\n');
        throw new Error(`Template rendering error: ${errorMessages}`);
      }
      throw new Error(`Failed to generate agreement document: ${error.message}`);
    }
  }
  
  /**
   * Get default template path
   */
  getDefaultTemplatePath(): string {
    // Check multiple possible locations
    const possiblePaths = [
      path.join(process.cwd(), 'resources', 'Sample-Tenancy-Agreement-2016-10.docx'),
      path.join(process.cwd(), 'uploads', 'templates', 'agreement-template.docx'),
      path.join(process.cwd(), 'templates', 'agreement-template.docx')
    ];
    
    for (const templatePath of possiblePaths) {
      if (fs.existsSync(templatePath)) {
        return templatePath;
      }
    }
    
    throw new Error('Agreement template not found. Please upload a template file.');
  }
  
  /**
   * Save generated document
   */
  async saveGeneratedDocument(
    documentBuffer: Buffer,
    outputPath: string
  ): Promise<string> {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(outputPath, documentBuffer);
    
    return outputPath;
  }
  
  /**
   * Generate and save agreement document
   */
  async generateAndSave(
    agreement: IAgreement,
    landlord: IUser,
    tenant: IUser,
    property: IProperty,
    templatePath?: string,
    outputPath?: string
  ): Promise<{ buffer: Buffer; filePath: string }> {
    // Use provided template or default
    const template = templatePath || this.getDefaultTemplatePath();
    
    // Generate document
    const buffer = await this.generateAgreementDocument(
      template,
      agreement,
      landlord,
      tenant,
      property
    );
    
    // Save if output path provided
    let filePath = '';
    if (outputPath) {
      filePath = await this.saveGeneratedDocument(buffer, outputPath);
    } else {
      // Generate default output path
      const outputDir = path.join(process.cwd(), 'uploads', 'agreements');
      const fileName = `agreement-${agreement._id}-${Date.now()}.docx`;
      filePath = path.join(outputDir, fileName);
      filePath = await this.saveGeneratedDocument(buffer, filePath);
    }
    
    return { buffer, filePath };
  }
}

export const agreementWordTemplateService = new AgreementWordTemplateService();






