"use client";

import type {
	MouseEvent as ReactMouseEvent,
	PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useRef, useState } from "react";

interface UseSettingsSheetStateOptions {
	show: boolean;
	isOpen: boolean;
	onClose: () => void;
}

interface SettingsSheetState {
	isVisible: boolean;
	dragOffsetY: number;
	isDragging: boolean;
	handleDragStart: (event: ReactPointerEvent<HTMLButtonElement>) => void;
	handleOverlayMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

export function useSettingsSheetState({
	show,
	isOpen,
	onClose,
}: UseSettingsSheetStateOptions): SettingsSheetState {
	const [isVisible, setIsVisible] = useState(false);
	const [dragOffsetY, setDragOffsetY] = useState(0);
	const dragStartYRef = useRef<number | null>(null);
	const isDraggingRef = useRef(false);

	useEffect(() => {
		if (!show) {
			return;
		}
		if (isOpen) {
			const animationFrameId = window.requestAnimationFrame(() => {
				setIsVisible(true);
			});
			return () => {
				window.cancelAnimationFrame(animationFrameId);
			};
		}
		setIsVisible(false);
	}, [show, isOpen]);

	useEffect(() => {
		const handlePointerMove = (event: PointerEvent) => {
			if (!isDraggingRef.current || dragStartYRef.current === null) {
				return;
			}
			const nextOffset = Math.max(0, event.clientY - dragStartYRef.current);
			setDragOffsetY(nextOffset);
		};

		const handlePointerEnd = () => {
			if (!isDraggingRef.current) {
				return;
			}
			isDraggingRef.current = false;
			dragStartYRef.current = null;
			setDragOffsetY((currentOffset) => {
				if (currentOffset > 120) {
					onClose();
				}
				return 0;
			});
		};

		window.addEventListener("pointermove", handlePointerMove);
		window.addEventListener("pointerup", handlePointerEnd);
		window.addEventListener("pointercancel", handlePointerEnd);

		return () => {
			window.removeEventListener("pointermove", handlePointerMove);
			window.removeEventListener("pointerup", handlePointerEnd);
			window.removeEventListener("pointercancel", handlePointerEnd);
		};
	}, [onClose]);

	const handleDragStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
		event.preventDefault();
		dragStartYRef.current = event.clientY;
		isDraggingRef.current = true;
	};

	const handleOverlayMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
		if (event.target !== event.currentTarget) {
			return;
		}
		setDragOffsetY(0);
		onClose();
	};

	return {
		isVisible,
		dragOffsetY,
		isDragging: isDraggingRef.current,
		handleDragStart,
		handleOverlayMouseDown,
	};
}
