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
		<div>
			<button
				type="button"
				onClick={onToggleDescription}
				className="text-left w-full mb-3"
			>
				<h3 className="text-white font-semibold flex items-center justify-between">
					概要
					<span className="text-purple-300 text-sm font-medium">
						{showDescription ? "簡潔に表示" : "もっと見る"}
					</span>
				</h3>
			</button>

			<p
				className={`text-slate-300 text-sm leading-relaxed transition-all duration-300 ${
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
	);
}
