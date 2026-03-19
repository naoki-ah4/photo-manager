import { createTheme, MantineColorsTuple } from '@mantine/core';

const primary: MantineColorsTuple = [
    "#fff8e2",
    "#ffefcd",
    "#fbdd9e",
    "#f9ca6b",
    "#f6bb40",
    "#f5b124",
    "#f5ad18",
    "#da9604",
    "#c28500",
    "#a87200"
]

const secondary: MantineColorsTuple = [
    "#fceef5",
    "#f3d8e6",
    "#eaaecd",
    "#e180b2",
    "#d95b9c",
    "#d5458e",
    "#d43987",
    "#bc2d74",
    "#a82567",
    "#9e1c60"
]

export default createTheme({
    colors: {
        primary,
        secondary,
    },
    primaryColor: 'primary',
});