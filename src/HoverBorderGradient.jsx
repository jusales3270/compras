import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function HoverBorderGradient({
    children,
    containerClassName,
    className,
    as: Tag = "button",
    duration = 1,
    clockwise = true,
    ...props
}) {
    const [hovered, setHovered] = useState(false);
    const [direction, setDirection] = useState("TOP");

    const rotateDirection = (currentDirection) => {
        const directions = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
        const currentIndex = directions.indexOf(currentDirection);
        const nextIndex = clockwise
            ? (currentIndex - 1 + directions.length) % directions.length
            : (currentIndex + 1) % directions.length;
        return directions[nextIndex];
    };

    const movingMap = {
        TOP: "radial-gradient(40% 50% at 50% 0%, rgba(255,255,255,0.7) 0%, rgba(255, 255, 255, 0) 100%)",
        LEFT: "radial-gradient(40% 50% at 0% 50%, rgba(255,255,255,0.7) 0%, rgba(255, 255, 255, 0) 100%)",
        BOTTOM:
            "radial-gradient(40% 50% at 50% 100%, rgba(255,255,255,0.7) 0%, rgba(255, 255, 255, 0) 100%)",
        RIGHT:
            "radial-gradient(40% 50% at 100% 50%, rgba(255,255,255,0.7) 0%, rgba(255, 255, 255, 0) 100%)",
    };

    const highlight =
        "radial-gradient(100% 180% at 50% 50%, rgba(139, 92, 246, 0.8) 0%, rgba(255, 255, 255, 0) 100%)";

    useEffect(() => {
        if (!hovered) {
            const interval = setInterval(() => {
                setDirection((prevState) => rotateDirection(prevState));
            }, duration * 1000);
            return () => clearInterval(interval);
        }
    }, [hovered, duration, clockwise]);

    return (
        <Tag
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={cn(
                "relative flex rounded-xl border-none content-center bg-white/5 hover:bg-white/10 transition duration-500 items-center flex-col flex-nowrap justify-center p-[1px] decoration-clone",
                containerClassName
            )}
            {...props}
        >
            <div
                className={cn(
                    "w-full h-full text-white z-10 bg-[#0a0f1e] backdrop-blur-md rounded-[inherit]",
                    className
                )}
            >
                {children}
            </div>
            <motion.div
                className="flex-none inset-0 absolute z-0 rounded-[inherit] overflow-hidden"
                style={{
                    filter: "blur(2px)",
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                }}
                initial={{ background: movingMap[direction] }}
                animate={{
                    background: hovered
                        ? [movingMap[direction], highlight]
                        : movingMap[direction],
                }}
                transition={{ ease: "linear", duration: duration ?? 1 }}
            />
            <div className="bg-[#0a0f1e] absolute z-1 flex-none inset-[1px] rounded-[inherit]" />
        </Tag>
    );
}
