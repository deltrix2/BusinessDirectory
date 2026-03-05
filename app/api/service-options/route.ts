import { NextResponse, NextRequest } from "next/server"
import { db } from "@/lib/database"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url!)
  const category = searchParams.get("category") || ""

  try {
    let query = `
      SELECT 
        so.option_id,
        so.name,
        so.slug,
        so.business_count,
        sc.name as category_name,
        sc.slug as category_slug
      FROM service_options so
      JOIN service_categories sc ON so.category_id = sc.category_id
    `
    
    const params: string[] = []
    
    if (category) {
      query += " WHERE sc.slug = $1"
      params.push(category)
    }
    
    query += " ORDER BY so.business_count DESC"
    
    // Використовуємо db.getMany замість ручного запиту через клієнт
    const options = await db.getMany(query, params)

    return NextResponse.json({ options })
  } catch (error) {
    console.error("Error fetching service options:", error)
    
    return NextResponse.json(
      { 
        error: "Failed to fetch service options", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
