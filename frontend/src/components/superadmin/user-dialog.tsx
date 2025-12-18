"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { API_BASE_URL } from "@/lib/api"
import { toast } from "sonner"
import { User } from "@/app/superadmin/users/page"

const formSchema = z.object({
    name: z.string().optional(),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres").optional().or(z.literal("")),
    role: z.string(), // "1" or "2"
})

interface UserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    userToEdit?: User | null // Se null, é criação
    onSuccess: () => void
}

export function UserDialog({ open, onOpenChange, userToEdit, onSuccess }: UserDialogProps) {
    const isEditing = !!userToEdit

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            role: "2", // Default Admin
        },
    })

    // Reset form when dialog opens/closes or userToEdit changes
    React.useEffect(() => {
        if (open) {
            if (userToEdit) {
                form.reset({
                    name: userToEdit.name || "",
                    email: userToEdit.email,
                    role: String(userToEdit.role),
                    password: "" // Don't fill password on edit
                })
            } else {
                form.reset({
                    name: "",
                    email: "",
                    password: "",
                    role: "2"
                })
            }
        }
    }, [open, userToEdit, form])

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        // Validação extra: Password required on create
        if (!isEditing && !values.password) {
            form.setError("password", { message: "Senha é obrigatória para novos usuários" })
            return
        }

        const token = document.cookie
            .split("; ")
            .find((row) => row.startsWith("access_token="))
            ?.split("=")[1]

        if (!token) return

        try {
            const endpoint = isEditing
                ? `${API_BASE_URL}/api/superadmin/users/${userToEdit.id}` // PUT
                : `${API_BASE_URL}/api/superadmin/users` // POST

            const method = isEditing ? "PUT" : "POST"

            const payload = {
                email: values.email,
                password: values.password,
                role_id: parseInt(values.role),
                name: values.name
            }

            const res = await fetch(endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || "Falha ao salvar usuário")
            }

            toast.success(isEditing ? "Usuário atualizado!" : "Usuário criado com sucesso!")
            onSuccess()
            onOpenChange(false)
        } catch (error: any) {
            console.error(error)
            toast.error("Erro: " + error.message)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? "Altere os dados do usuário abaixo." : "Preencha os dados para criar um novo acesso."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: João da Silva" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="admin@exemplo.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Senha {isEditing && "(Deixe em branco para não alterar)"}</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="******" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nível de Acesso</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione um nível" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="2">Admin (Cliente)</SelectItem>
                                            <SelectItem value="1">Superadmin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">Salvar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
