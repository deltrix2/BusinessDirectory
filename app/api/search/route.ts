import { NextResponse, NextRequest } from "next/server"
import { db } from "@/lib/database"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url!)
  const page = parseInt(searchParams.get("page") || "1", 10)
  const pageSize = 9
  const offset = (page - 1) * pageSize

  // Search query
  const searchQuery = searchParams.get("q")?.toLowerCase() || ""
  const category = searchParams.get("category") || "All Categories"
  const rating = searchParams.get("rating") || "Any Rating"

  try {
    // Build SQL query dynamically
    const whereClauses: string[] = []
    const params: (string | number)[] = []
    let paramIndex = 1

    // Enhanced search with LIKE queries for better matching
    if (searchQuery) {
      whereClauses.push(`(
        LOWER(b.title) LIKE $${paramIndex} OR 
        LOWER(b.category) LIKE $${paramIndex} OR 
        LOWER(b.address) LIKE $${paramIndex} OR
        LOWER(b.city) LIKE $${paramIndex} OR
        LOWER(b.description_arr) LIKE $${paramIndex} OR
        LOWER(b.type) LIKE $${paramIndex}
      )`)
      params.push(`%${searchQuery}%`)
      paramIndex++
    }

    if (category !== "All Categories") {
      whereClauses.push(`b.category = $${paramIndex}`)
      params.push(category)
      paramIndex++
    }

    if (rating !== "Any Rating") {
      whereClauses.push(`b.rating >= $${paramIndex}`)
      params.push(parseFloat(rating.replace("+", "")))
      paramIndex++
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM businesses b ${where}`
    const total = await db.getCount(countQuery, params)

    // Get paginated results with proper sorting
    let orderBy = "b.data_id ASC"
    const queryParams = [...params]
    
    if (searchQuery) {
      orderBy = `
        CASE 
          WHEN LOWER(b.title) LIKE $${paramIndex} THEN 1
          WHEN LOWER(b.category) LIKE $${paramIndex} THEN 2
          WHEN LOWER(b.address) LIKE $${paramIndex} THEN 3
          ELSE 4
        END,
        b.rating DESC, 
        b.reviews DESC,
        b.data_id ASC
      `
      queryParams.push(`%${searchQuery}%`)
      paramIndex++
    } else {
      orderBy = "b.rating DESC, b.reviews DESC, b.data_id ASC"
    }

    const sqlQuery = `SELECT * FROM businesses b ${where} ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    queryParams.push(pageSize, offset)
    
    const businesses = await db.getMany(sqlQuery, queryParams)

    return NextResponse.json({ total, businesses })
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
