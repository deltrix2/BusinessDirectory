import { NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET() {
  try {
    // Використовуємо db.getMany для отримання списку бізнесів
    const businesses = await db.getMany('SELECT * FROM businesses LIMIT 10')
    
    return NextResponse.json(businesses)
  } catch (error) {
    console.error("Error fetching preview businesses:", error)
    
    return NextResponse.json(
      { 
        error: "Failed to fetch preview businesses", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
