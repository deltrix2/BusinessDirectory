import { NextResponse } from "next/server"
import { db } from "@/lib/database"

export async function GET() {
  try {
    const query = `
      SELECT 
        sc.category_id,
        sc.name,
        sc.slug,
        sc.description,
        COUNT(so.option_id) as option_count,
        SUM(so.business_count) as total_businesses
      FROM service_categories sc
      LEFT JOIN service_options so ON sc.category_id = so.category_id
      GROUP BY sc.category_id
      ORDER BY total_businesses DESC
    `

    const categories = await db.getMany(query)

    return NextResponse.json({ categories })

  } catch (error) {
    console.error("Error fetching service categories:", error)

    return NextResponse.json(
      { 
        error: "Failed to fetch service categories",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
