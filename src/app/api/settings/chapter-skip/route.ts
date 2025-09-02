import { type NextRequest, NextResponse } from "next/server";
import { settingsPrisma } from "@/libs/settingsPrisma";

export async function GET() {
	try {
		const skipRules = await settingsPrisma.chapterSkipRule.findMany({
			orderBy: { createdAt: "asc" },
		});

		return NextResponse.json({
			success: true,
			data: skipRules,
		});
	} catch (error) {
		console.error("Error fetching chapter skip rules:", error);
		return NextResponse.json(
			{ error: "Failed to fetch chapter skip rules" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { pattern, enabled = true } = body;

		if (!pattern || typeof pattern !== "string" || pattern.trim() === "") {
			return NextResponse.json(
				{ error: "Pattern is required" },
				{ status: 400 },
			);
		}

		// 既存のパターンの重複チェック
		const existingRule = await settingsPrisma.chapterSkipRule.findFirst({
			where: { pattern: pattern.trim() },
		});

		if (existingRule) {
			return NextResponse.json(
				{ error: "Pattern already exists" },
				{ status: 409 },
			);
		}

		const newRule = await settingsPrisma.chapterSkipRule.create({
			data: {
				pattern: pattern.trim(),
				enabled,
			},
		});

		return NextResponse.json({
			success: true,
			data: newRule,
		});
	} catch (error) {
		console.error("Error creating chapter skip rule:", error);
		return NextResponse.json(
			{ error: "Failed to create chapter skip rule" },
			{ status: 500 },
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();
		const { id, pattern, enabled } = body;

		if (!id) {
			return NextResponse.json(
				{ error: "Rule ID is required" },
				{ status: 400 },
			);
		}

		const updateData: {
			pattern?: string;
			enabled?: boolean;
			updatedAt: Date;
		} = {
			updatedAt: new Date(),
		};

		if (pattern !== undefined) {
			if (typeof pattern !== "string" || pattern.trim() === "") {
				return NextResponse.json(
					{ error: "Pattern cannot be empty" },
					{ status: 400 },
				);
			}

			// 他のルールとの重複チェック
			const existingRule = await settingsPrisma.chapterSkipRule.findFirst({
				where: { pattern: pattern.trim(), NOT: { id } },
			});

			if (existingRule) {
				return NextResponse.json(
					{ error: "Pattern already exists" },
					{ status: 409 },
				);
			}

			updateData.pattern = pattern.trim();
		}

		if (enabled !== undefined) {
			updateData.enabled = enabled;
		}

		const updatedRule = await settingsPrisma.chapterSkipRule.update({
			where: { id },
			data: updateData,
		});

		return NextResponse.json({
			success: true,
			data: updatedRule,
		});
	} catch (error) {
		console.error("Error updating chapter skip rule:", error);
		return NextResponse.json(
			{ error: "Failed to update chapter skip rule" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const id = searchParams.get("id");

		if (!id) {
			return NextResponse.json(
				{ error: "Rule ID is required" },
				{ status: 400 },
			);
		}

		await settingsPrisma.chapterSkipRule.delete({
			where: { id },
		});

		return NextResponse.json({
			success: true,
		});
	} catch (error) {
		console.error("Error deleting chapter skip rule:", error);
		return NextResponse.json(
			{ error: "Failed to delete chapter skip rule" },
			{ status: 500 },
		);
	}
}
