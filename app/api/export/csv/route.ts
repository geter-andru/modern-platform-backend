/**
 * REAL CSV Export API
 * Generates actual CSV files for CRM import
 * No placeholders - real downloadable CSV files
 */

import { NextRequest, NextResponse } from 'next/server';
import { createObjectCsvStringifier } from 'csv-writer';

interface ExportRequest {
  data: any[] | string;
  title: string;
  headers?: string[];
}

export async function POST(request: NextRequest) {
  console.log('📄 REAL CSV Export API called');
  
  try {
    const body: ExportRequest = await request.json();
    const { data, title, headers } = body;
    
    if (!data || !title) {
      return NextResponse.json(
        { error: 'Data and title are required' },
        { status: 400 }
      );
    }

    console.log(`📊 Generating REAL CSV: "${title}"`);
    
    let csvContent = '';
    
    if (typeof data === 'string') {
      // If data is markdown/text, convert to CSV format
      const lines = data.split('\n');
      const csvData: any[] = [];
      
      lines.forEach(line => {
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const parts = line.substring(2).split(':');
          csvData.push({
            field: parts[0]?.trim() || '',
            value: parts[1]?.trim() || line.substring(2)
          });
        } else if (line.includes(':')) {
          const parts = line.split(':');
          csvData.push({
            field: parts[0]?.trim() || '',
            value: parts.slice(1).join(':').trim()
          });
        }
      });
      
      if (csvData.length > 0) {
        const csvStringifier = createObjectCsvStringifier({
          header: [
            { id: 'field', title: 'Field' },
            { id: 'value', title: 'Value' }
          ]
        });
        
        csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(csvData);
      } else {
        // Fallback: just create a simple CSV with the content
        csvContent = '"Content"\n' + lines.map(line => `"${line.replace(/"/g, '""')}"`).join('\n');
      }
      
    } else if (Array.isArray(data)) {
      // If data is already structured, convert directly
      if (data.length > 0) {
        const keys = headers || Object.keys(data[0]);
        const csvStringifier = createObjectCsvStringifier({
          header: keys.map(key => ({ id: key, title: key }))
        });
        
        csvContent = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(data);
      } else {
        csvContent = 'No data';
      }
    }
    
    const csvBuffer = Buffer.from(csvContent, 'utf-8');
    console.log(`✅ Real CSV generated: ${csvBuffer.length} bytes`);
    
    // Return the actual CSV file
    return new NextResponse(csvBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${title.replace(/[^a-z0-9]/gi, '_')}.csv"`,
        'Content-Length': csvBuffer.length.toString(),
        'X-Real-Export': 'true'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Real CSV export error:', error);
    
    return NextResponse.json(
      { 
        error: 'CSV export failed',
        message: error.message,
        real: true
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    status: 'Real CSV Export API is running',
    endpoint: '/api/export/csv',
    accepts: {
      data: 'array or string (required)',
      title: 'string (required)',
      headers: 'string[] (optional)'
    },
    real: true,
    library: 'csv-writer',
    output: 'Real CSV files for CRM import'
  });
}