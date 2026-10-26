'use client'

import {useState} from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import CloseIcon from '@mui/icons-material/Close'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import {apiUrl} from '@/common/api/apiClient'
import {IconTextButton} from '@/common/components'
import {Text} from '@/common/text'
import {useUrlState} from '@/common/url'
import {buildExportPath, type ExportEntity, type ExportFormat} from './exportPath'

export interface ExportDialogProps {
    /** Which list to export. The translation/topic toggles exist only for projects. */
    entity: ExportEntity
}

// A plain link click, not fetch + blob: the api streams the file with
// Content-Disposition: attachment, so the browser downloads it without
// buffering it in the tab or navigating away from /search.
function triggerDownload(url: string) {
    const link = document.createElement('a')
    link.href = url
    link.download = ''
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    link.remove()
}

// Trigger + Dialog in one component, same shell as minorities' AboutListButton.
export function ExportDialog({entity}: ExportDialogProps) {
    const {params} = useUrlState()
    const [open, setOpen] = useState(false)
    const [format, setFormat] = useState<ExportFormat>('csv')
    const [excludeTranslated, setExcludeTranslated] = useState(false)
    const [includeTopic, setIncludeTopic] = useState(false)
    const projectToggles = entity === 'projects'

    function handleDownload() {
        triggerDownload(apiUrl(buildExportPath(entity, params, {format, excludeTranslated, includeTopic})))
        setOpen(false)
    }

    return (
        <>
            <IconTextButton
                icon={<FileDownloadOutlinedIcon fontSize="small" />}
                label="Download"
                onClick={() => setOpen(true)}
                // Sized as a peer of RankingButton beside it.
                sx={{
                    height: 32,
                    px: 1.25,
                    py: 0,
                    typography: 'body2',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    borderColor: 'divider',
                    '&:hover': {borderColor: 'divider'},
                }}
            />

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <IconButton
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    size="small"
                    sx={{position: 'absolute', top: 14, right: 14, color: 'text.disabled'}}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>

                <Box sx={{p: {xs: 3, sm: 4.5}, pt: {xs: 4, sm: 5}, maxHeight: '85vh', overflowY: 'auto'}}>
                    <Text variant="h5" sx={{mb: 3}}>
                        Download these {entity}
                    </Text>

                    <Text variant="body2" sx={{fontWeight: 600, mb: 0.5}}>
                        Format
                    </Text>
                    <RadioGroup row value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)} sx={{mb: 2}}>
                        <FormControlLabel value="csv" control={<Radio size="small" />} label={<Text variant="body2">CSV</Text>} />
                        <FormControlLabel value="json" control={<Radio size="small" />} label={<Text variant="body2">JSON</Text>} />
                    </RadioGroup>

                    {projectToggles && (
                        <Box sx={{display: 'flex', flexDirection: 'column', mb: 2}}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={excludeTranslated}
                                        onChange={(event) => setExcludeTranslated(event.target.checked)}
                                    />
                                }
                                label={<Text variant="body2">Exclude machine-translated projects</Text>}
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        size="small"
                                        checked={includeTopic}
                                        onChange={(event) => setIncludeTopic(event.target.checked)}
                                    />
                                }
                                label={<Text variant="body2">Include topic classification</Text>}
                            />
                        </Box>
                    )}

                    <Text variant="body2" color="text.secondary" sx={{lineHeight: 1.6, mb: 3}}>
                        The download contains every {entity === 'projects' ? 'project' : 'work'} matching your current
                        search and filters, up to 1,000,000 rows.
                    </Text>

                    <Box sx={{display: 'flex', justifyContent: 'flex-end'}}>
                        <Button
                            variant="contained"
                            startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
                            onClick={handleDownload}
                            sx={{textTransform: 'none'}}
                        >
                            Download
                        </Button>
                    </Box>
                </Box>
            </Dialog>
        </>
    )
}
