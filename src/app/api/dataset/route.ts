import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'public', 'data', 'moil_synthetic_training_dataset.csv');
    if (!fs.existsSync(csvPath)) {
      return new NextResponse('Dataset file not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(csvPath);
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="moil_manganese_satellite_training_dataset.csv"',
      },
    });
  } catch (error) {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
