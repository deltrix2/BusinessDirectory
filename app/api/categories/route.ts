import { NextResponse, NextRequest } from "next/server"
import { db } from "@/lib/database"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url!)
  const page = parseInt(searchParams.get("page") || "1", 10)
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10)
  const offset = (page - 1) * pageSize

  // Filters
  const search = searchParams.get("search")?.toLowerCase() || ""

  try {
    // Build SQL query dynamically
    const whereClauses: string[] = []
    const params: string[] = []

    if (search) {
      whereClauses.push("(LOWER(name) LIKE $1 OR LOWER(description) LIKE $1)")
      params.push(`%${search}%`)
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM categories ${where}`
    const total = await db.getCount(countQuery, params)

    // Get paginated results
    const query = `SELECT * FROM categories ${where} ORDER BY category_id ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    const queryParams = [...params, pageSize.toString(), offset.toString()]
    const categories = await db.getMany(query, queryParams)

    return NextResponse.json({ total, categories })
  } catch (error) {
    console.error('Database query error:', error)
    return NextResponse.json(
      { 
        error: 'Database query failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
