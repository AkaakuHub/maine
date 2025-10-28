"use client";

interface VideoDescriptionProps {
	description?: string;
	showDescription: boolean;
	onToggleDescription: () => void;
}

export default function VideoDescription({
	description,
	showDescription,
	onToggleDescription,
}: VideoDescriptionProps) {
	return (
		<div className="space-y-4">
			{/* 概要セクション - descriptionがある場合のみ表示 */}
			{description?.trim() && (
				<div>
					<button
						type="button"
						onClick={onToggleDescription}
						className="text-left w-full mb-3"
					>
						<h3 className="text-text font-semibold flex items-center justify-between">
							概要
							<span className="text-primary text-sm font-medium">
								{showDescription ? "簡潔に表示" : "もっと見る"}
							</span>
						</h3>
					</button>

					<p
						className={`text-text-secondary text-sm leading-relaxed transition-all duration-300 whitespace-pre-wrap ${
							showDescription ? "" : "overflow-hidden text-ellipsis"
						}`}
						style={
							!showDescription
								? {
										display: "-webkit-box",
										WebkitLineClamp: 3,
										WebkitBoxOrient: "vertical",
										overflow: "hidden",
									}
								: {}
						}
					>
						{description}
					</p>
				</div>
			)}
		</div>
	);
}
