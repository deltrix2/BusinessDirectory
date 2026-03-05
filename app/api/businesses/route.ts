import { NextResponse, NextRequest } from "next/server"
import { db } from "@/lib/database"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url!)
  const page = parseInt(searchParams.get("page") || "1", 10)
  const pageSize = 10
  const offset = (page - 1) * pageSize

  // Filters
  const search = searchParams.get("search")?.toLowerCase() || ""
  const category = searchParams.get("category") || "All Categories"
  const rating = searchParams.get("rating") || "Any Rating"
  const location = searchParams.get("location")?.toLowerCase() || ""
  const serviceOptions = searchParams.get("serviceOptions")?.split(",").filter(Boolean) || []
  const amenities = searchParams.get("amenities")?.split(",").filter(Boolean) || []
  const accessibility = searchParams.get("accessibility")?.split(",").filter(Boolean) || []
  const paymentMethods = searchParams.get("paymentMethods")?.split(",").filter(Boolean) || []

  try {
    // Build SQL query dynamically
    const whereClauses: string[] = []
    const params: (string | number)[] = []
    const joins: string[] = []
    let paramIndex = 1

    if (search) {
      whereClauses.push(`(LOWER(b.title) LIKE $${paramIndex} OR LOWER(b.category) LIKE $${paramIndex} OR LOWER(b.address) LIKE $${paramIndex})`)
      params.push(`%${search}%`)
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
    if (location) {
      whereClauses.push(`(LOWER(b.city) LIKE $${paramIndex} OR LOWER(b.address) LIKE $${paramIndex})`)
      params.push(`%${location}%`)
      paramIndex++
    }

    // Service options filtering
    if (serviceOptions.length > 0 || amenities.length > 0 || accessibility.length > 0 || paymentMethods.length > 0) {
      if (serviceOptions.length > 0) {
        joins.push("JOIN business_service_options bso_service ON b.data_id = bso_service.business_id")
        joins.push("JOIN service_options so_service ON bso_service.option_id = so_service.option_id")
      }
      if (amenities.length > 0) {
        joins.push("JOIN business_service_options bso_amenities ON b.data_id = bso_amenities.business_id")
        joins.push("JOIN service_options so_amenities ON bso_amenities.option_id = so_amenities.option_id")
        joins.push("JOIN service_categories sc_amenities ON so_amenities.category_id = sc_amenities.category_id")
      }
      if (accessibility.length > 0) {
        joins.push("JOIN business_service_options bso_accessibility ON b.data_id = bso_accessibility.business_id")
        joins.push("JOIN service_options so_accessibility ON bso_accessibility.option_id = so_accessibility.option_id")
        joins.push("JOIN service_categories sc_accessibility ON so_accessibility.category_id = sc_accessibility.category_id")
      }
      if (paymentMethods.length > 0) {
        joins.push("JOIN business_service_options bso_payments ON b.data_id = bso_payments.business_id")
        joins.push("JOIN service_options so_payments ON bso_payments.option_id = so_payments.option_id")
        joins.push("JOIN service_categories sc_payments ON so_payments.category_id = sc_payments.category_id")
      }
    }

    if (serviceOptions.length > 0) {
      const placeholders = serviceOptions.map(() => `$${paramIndex++}`).join(",")
      whereClauses.push(`so_service.slug IN (${placeholders})`)
      params.push(...serviceOptions)
    }
    if (amenities.length > 0) {
      const placeholders = amenities.map(() => `$${paramIndex++}`).join(",")
      whereClauses.push(`(sc_amenities.slug = 'amenities' AND so_amenities.slug IN (${placeholders}))`)
      params.push(...amenities)
    }
    if (accessibility.length > 0) {
      const placeholders = accessibility.map(() => `$${paramIndex++}`).join(",")
      whereClauses.push(`(sc_accessibility.slug = 'accessibility' AND so_accessibility.slug IN (${placeholders}))`)
      params.push(...accessibility)
    }
    if (paymentMethods.length > 0) {
      const placeholders = paymentMethods.map(() => `$${paramIndex++}`).join(",")
      whereClauses.push(`(sc_payments.slug = 'payments' AND so_payments.slug IN (${placeholders}))`)
      params.push(...paymentMethods)
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""
    const joinClause = [...new Set(joins)].join(" ")

    // Get total count
    const countQuery = `SELECT COUNT(DISTINCT b.data_id) as count FROM businesses b ${joinClause} ${where}`
    const total = await db.getCount(countQuery, params)

    // Get paginated results
    const query = `SELECT DISTINCT b.* FROM businesses b ${joinClause} ${where} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    const queryParams = [...params, pageSize, offset]
    const businesses = await db.getMany(query, queryParams)
    
    return NextResponse.json({ total, businesses })
  } catch (error) {
    console.error('Database query error:', error);
    return NextResponse.json(
      { error: 'Database query failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
