import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { Logger } from '../services/Logger';

const TEMPLATES_DIR = path.join(__dirname);

const cache = new Map<string, HandlebarsTemplateDelegate>();

function loadTemplate(templateName: string): HandlebarsTemplateDelegate {
  if (cache.has(templateName)) {
    return cache.get(templateName)!;
  }

  const filePath = path.join(TEMPLATES_DIR, `${templateName}.hbs`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }

  const source = fs.readFileSync(filePath, 'utf-8');
  const template = Handlebars.compile(source);
  cache.set(templateName, template);
  Logger.info('Template loaded', { templateName });
  return template;
}

export function render(templateName: string, data: Record<string, unknown>): string {
  const template = loadTemplate(templateName);
  return template(data);
}

export function clearCache(): void {
  cache.clear();
  Logger.info('Template cache cleared');
}
