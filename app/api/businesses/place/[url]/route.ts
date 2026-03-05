import { NextResponse, NextRequest } from "next/server"
import { db } from "@/lib/database"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ url: string }> }
) {
  const { url } = await params
  
  try {
    // Використовуємо db.getOne замість ручного запиту через клієнт
    const business = await db.getOne(
      'SELECT * FROM businesses WHERE url = $1', 
      [url]
    )
    
    if (!business) {
      return NextResponse.json(
        { error: "Business not found" }, 
        { status: 404 }
      )
    }
    
    return NextResponse.json(business)
  } catch (error) {
    console.error("Error fetching business:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch business", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
