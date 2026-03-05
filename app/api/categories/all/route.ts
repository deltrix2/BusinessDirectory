import { NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET() {
  try {
    // Отримуємо всі категорії через пул з'єднань
    const categories = await db.getMany(
      `SELECT category_id, name, url, count FROM categories ORDER BY count DESC`
    )

    return NextResponse.json({ categories })
  } catch (error) {
    console.error("Error fetching categories:", error)
    
    return NextResponse.json(
      { 
        error: "Failed to fetch categories", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
